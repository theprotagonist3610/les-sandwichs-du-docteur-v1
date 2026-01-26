import Actions from "./utilisateurs/Actions";
import Presence from "./utilisateurs/Presence";
import UserApprovalList from "@/components/users/UserApprovalList";
import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
import WithPermission from "@/components/auth/WithPermission";
import { canViewUsers } from "@/utils/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MobileUtilisateurs = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="p-4 pb-20">
        {/* En-tête de la page - Mobile */}
        <div className="mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Utilisateurs
            </h1>
            <p className="text-sm text-muted-foreground">
              Gérez vos utilisateurs et suivez leur présence
            </p>
          </div>
        </div>

        {/* Tabs - Mobile */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="text-xs">
              En attente
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs">
              Utilisateurs actifs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <UserApprovalList />
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <div className="space-y-6">
              <Presence />
              <Actions />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
const DesktopUtilisateurs = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="max-w-7xl mx-auto p-8">
        {/* En-tête de la page - Desktop */}
        <div className="mb-10">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Utilisateurs
            </h1>
            <p className="text-base text-muted-foreground">
              Gérez vos utilisateurs et suivez leur présence
            </p>
          </div>
        </div>

        {/* Tabs - Desktop */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="pending">En attente</TabsTrigger>
            <TabsTrigger value="active">Utilisateurs actifs</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <UserApprovalList />
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Presence - 1/3 de la largeur */}
              <div className="lg:col-span-1">
                <Presence />
              </div>
              {/* Actions - 2/3 de la largeur */}
              <div className="lg:col-span-2">
                <Actions />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
const Utilisateurs = () => {
  return (
    <>
      <MobileUtilisateurs />
      <DesktopUtilisateurs />
    </>
  );
};

// Protéger la page - accessible uniquement aux admins et superviseurs
export default WithPermission(
  Utilisateurs,
  (userRole) => canViewUsers(userRole),
  "/",
);
