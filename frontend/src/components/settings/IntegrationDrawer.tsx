import { motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import Logo from "../nav/Logo";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { axiosInstance } from "@/utils";
import { Loader2 } from "lucide-react";

export default function IntegrationDrawer({ open, drawerState, onClose }) {
  const [isConnecting, setIsConnecting] = useState(false);

  if (!drawerState) return null;

  console.log(drawerState);
  const beamColor = useMemo(
    () => (drawerState.isConnected ? "34,197,94" : "239,68,68"),
    [drawerState.isConnected]
  );

  const [selectedScopes, setSelectedScopes] = useState(
    drawerState.connectedScopes?.map((s) => s) || []
  );
  console.log(selectedScopes)

  const toggleScope = (id) => {
    console.log(selectedScopes);
    setSelectedScopes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedScopes.length === drawerState.scopes.length) {
      setSelectedScopes([]);
    } else {
      setSelectedScopes(drawerState.scopes.map((s) => s._id));
    }
  };

  const handleConnection = async () => {
    if (selectedScopes.length === 0) {
      toast.success("Please select at least one permission to continue.");
      return;
    }

    setIsConnecting(true);
    try {
      console.log(
        selectedScopes,
        "...................................................................................."
      );

      const sData = {
        scopes: selectedScopes,
        service: drawerState.service,
      };

      const { data } = await axiosInstance.post(
        "/connection/google-service-init",
        sData
      );

      if (data?.data) {
        window.location = data.data;
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to initiate connection. Please try again."
      );
      setIsConnecting(false);
    }
  };
  console.log(drawerState);

  return (
    <Drawer open={open} direction="right" onOpenChange={onClose}>
      <DrawerContent className="max-w-md ml-auto rounded-l-2xl border-l shadow-xl flex flex-col">
        <DrawerHeader className="pb-4">
          <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
            Integration — {drawerState.displayName}
          </DrawerTitle>

          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="size-12 flex items-center justify-center rounded-xl shadow-md bg-background border">
              <Logo variant="icon-only" className="size-8" />
            </div>

            <motion.svg
              width="150"
              height="3"
              viewBox="0 0 150 3"
              xmlns="http://www.w3.org/2000/svg"
              initial={{ opacity: 0 }}
              animate={{ opacity: open ? 1 : 0 }}
              transition={{ duration: 0.4 }}
            >
              <defs>
                <linearGradient id="baseLine" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#e5e7eb" />
                  <stop offset="100%" stopColor="#e5e7eb" />
                </linearGradient>

                <linearGradient id="beamGradient" x1="0%" x2="100%">
                  <stop offset="0%" stopColor={`rgba(${beamColor},0)`} />
                  <stop offset="45%" stopColor={`rgba(${beamColor},1)`} />
                  <stop offset="55%" stopColor={`rgba(${beamColor},1)`} />
                  <stop offset="100%" stopColor={`rgba(${beamColor},0)`} />
                </linearGradient>

                <mask id="beamMask">
                  <motion.rect
                    width="60"
                    height="2"
                    fill="white"
                    initial={{ x: -60 }}
                    animate={open ? { x: [-60, 150] } : { x: -60 }}
                    transition={{
                      duration: 1.2,
                      repeat: open ? Infinity : 0,
                      ease: "linear",
                    }}
                  />
                </mask>
              </defs>

              <line
                x1="0"
                y1="1.5"
                x2="150"
                y2="1.5"
                stroke="url(#baseLine)"
                strokeWidth="1"
                strokeLinecap="round"
              />

              <motion.rect
                x="0"
                y="0"
                width="150"
                height="3"
                fill="url(#beamGradient)"
                mask="url(#beamMask)"
                style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.4))" }}
              />
            </motion.svg>

            <div className="size-12 flex items-center justify-center rounded-xl shadow-md bg-background border">
              <img
                src={`http://localhost:5000${drawerState.iconUrl}`}
                alt={drawerState.displayName}
                className="size-8 object-contain"
              />
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Permissions Requested</h3>
            <button
              onClick={selectAll}
              disabled={isConnecting}
              className="text-sm text-primary hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedScopes.length === drawerState.scopes.length
                ? "Unselect All"
                : "Select All"}
            </button>
          </div>

          <div className="space-y-3">
            {drawerState.scopes.map((scope, i) => (
              <motion.div
                key={scope._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.09 }}
                onClick={() => !isConnecting && toggleScope(scope._id)}
                className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 ${
                  selectedScopes.includes(scope._id)
                    ? "bg-accent border-primary"
                    : "bg-background hover:bg-accent/50"
                } ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Checkbox
                  checked={selectedScopes.includes(scope._id)}
                  onCheckedChange={() => toggleScope(scope._id)}
                  disabled={isConnecting}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">{scope.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 break-all">
                    {scope.name}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <DrawerFooter className="border-t px-6 py-4">
          <Button
            className="w-full font-medium"
            onClick={handleConnection}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              `Connect ${drawerState.displayName}`
            )}
          </Button>
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
