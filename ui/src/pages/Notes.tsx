import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Company } from "@paperclipai/shared";
import { companiesApi } from "../api/companies";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "../components/EmptyState";
import { FileText, RotateCcw } from "lucide-react";
import { formatDateTime, relativeTime } from "../lib/utils";
import { queryKeys } from "../lib/queryKeys";

export function Notes() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef(body);
  const selectedCompanyIdRef = useRef<string | null>(null);
  const lastServerNotesRef = useRef("");
  const lastSaveRequestIdRef = useRef(0);

  bodyRef.current = body;

  useEffect(() => {
    setBreadcrumbs([{ label: "Notes" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (!selectedCompanyId) {
      selectedCompanyIdRef.current = null;
      lastServerNotesRef.current = "";
      setBody("");
      setSaveError(null);
      return;
    }
    const incomingNotes = selectedCompany?.notes ?? "";
    const companyChanged = selectedCompanyIdRef.current !== selectedCompanyId;
    const canApplyServerValue = companyChanged || bodyRef.current === lastServerNotesRef.current;
    selectedCompanyIdRef.current = selectedCompanyId;
    lastServerNotesRef.current = incomingNotes;
    if (canApplyServerValue) {
      setBody(incomingNotes);
    }
    setSaveError(null);
  }, [selectedCompany?.notes, selectedCompanyId]);

  const updateNotes = useMutation({
    mutationFn: ({ notes }: { notes: string; requestId: number }) =>
      companiesApi.updateNotes(selectedCompanyId!, {
        notes: notes.length > 0 ? notes : null,
      }),
    onSuccess: (company, { notes, requestId }) => {
      if (requestId !== lastSaveRequestIdRef.current) return;
      setSaveError(null);
      lastServerNotesRef.current = company.notes ?? "";
      queryClient.setQueryData<Company[]>(queryKeys.companies.all, (current) =>
        current?.map((entry) => entry.id === company.id ? company : entry) ?? current,
      );
      if (bodyRef.current === notes) {
        setBody(company.notes ?? "");
      }
    },
    onError: (error, { requestId }) => {
      if (requestId !== lastSaveRequestIdRef.current) return;
      setSaveError(error instanceof Error ? error.message : "Failed to save notes");
    },
  });

  useEffect(() => {
    if (!selectedCompanyId) return;
    if (body === (selectedCompany?.notes ?? "")) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      const requestId = lastSaveRequestIdRef.current + 1;
      lastSaveRequestIdRef.current = requestId;
      updateNotes.mutate({ notes: body, requestId });
    }, 700);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [body, selectedCompany?.notes, selectedCompanyId, updateNotes]);

  const noteCount = useMemo(() => {
    return body
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
  }, [body]);

  if (!selectedCompanyId) {
    return <EmptyState icon={FileText} message="Select a company to open notes." />;
  }

  const isDirty = body !== (selectedCompany?.notes ?? "");
  const updatedAt = selectedCompany?.updatedAt ?? null;

  return (
    <div className="space-y-4">
      <Card className="gap-0">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                Quick notes for {selectedCompany?.name ?? "this company"}. Saved to Paperclip and shared across sessions.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{noteCount} {noteCount === 1 ? "line" : "lines"}</span>
              <span aria-hidden="true">•</span>
              <span>
                {updateNotes.isPending || isDirty
                  ? "Saving..."
                  : updatedAt
                    ? `Saved ${relativeTime(updatedAt)}`
                    : "Nothing saved yet"}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          <Textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setSaveError(null);
            }}
            placeholder="Write whatever you need to remember for this company."
            className="min-h-[420px] resize-y font-mono text-sm leading-6"
          />
          <div className="flex flex-col gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
            <span>
              {saveError
                ? saveError
                : updatedAt
                  ? `Last updated ${formatDateTime(updatedAt)}`
                  : "Changes autosave as you type."}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => setBody("")} disabled={body.length === 0}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Clear notes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
