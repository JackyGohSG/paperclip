import { PluginSlotOutlet, usePluginSlots } from "@/plugins/slots";
import {
  PluginLauncherOutlet,
  PluginLauncherProvider,
  usePluginLaunchers,
} from "@/plugins/launchers";

type GlobalToolbarContext = { companyId: string | null; companyPrefix: string | null };

export function GlobalToolbarPlugins({ context }: { context: GlobalToolbarContext }) {
  const { slots } = usePluginSlots({ slotTypes: ["globalToolbarButton"], companyId: context.companyId });
  const { launchers } = usePluginLaunchers({
    placementZones: ["globalToolbarButton"],
    companyId: context.companyId,
    enabled: !!context.companyId,
  });

  if (slots.length === 0 && launchers.length === 0) return null;

  return (
    <PluginLauncherProvider>
      <div className="flex items-center gap-1 ml-auto shrink-0 pl-2">
        <PluginSlotOutlet
          slotTypes={["globalToolbarButton"]}
          context={context}
          className="flex items-center gap-1"
        />
        <PluginLauncherOutlet
          placementZones={["globalToolbarButton"]}
          context={context}
          className="flex items-center gap-1"
        />
      </div>
    </PluginLauncherProvider>
  );
}
