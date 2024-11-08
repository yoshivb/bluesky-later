import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function OfflineInfo() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        The scheduled posts will be sent to Bluesky at the scheduled time as
        long as this tab is open and you have internet connection. Otherwise,
        they will be sent at the same time when this tab is re-opened and
        online.
      </AlertDescription>
    </Alert>
  );
}
