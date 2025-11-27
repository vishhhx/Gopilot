

import ErrorState from "@/components/Other/common/ErrorState";
import IntegrationCard from "@/components/settings/IntegrationCard";
import { axiosInstance } from "@/utils";
import { useEffect, useState } from "react";
import IntegrationDrawer from "@/components/settings/IntegrationDrawer";

function IntegrationPage() {
  const [integrations, setIntegrations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const [drawerState, setDrawerState] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);


  const getAllIntegrations = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axiosInstance.get(
        "/connection/get-all-connetions"
      );
      setIntegrations(data.data);
    } catch (error) {
      console.error(error);
      setError(error.response?.data?.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllIntegrations();
  }, []);


  const handleOpenDrawer = (integration) => {
    setDrawerState(integration);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };


  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading integrations...</p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <ErrorState
        type="network"
        title="Failed to Load Integrations"
        description={error}
        onRetry={getAllIntegrations}
        showRetryButton
        fullHeight
      />
    );
  }


  if (!integrations || integrations.length === 0) {
    return (
      <ErrorState
        type="notFound"
        title="No integrations available"
        description="There are currently no integrations to display."
        fullHeight
      />
    );
  }

  return (
    <div className="flex-1 h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect your favorite services and tools
        </p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((inte) => (
          <IntegrationCard
            key={inte._id?.$oid || inte._id}
            cardDetails={inte}
            onConnect={() => handleOpenDrawer(inte)}
          />
        ))}
      </div>


      {drawerState && (
        <IntegrationDrawer
          drawerState={drawerState}
          open={isDrawerOpen}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  );
}

export default IntegrationPage;
