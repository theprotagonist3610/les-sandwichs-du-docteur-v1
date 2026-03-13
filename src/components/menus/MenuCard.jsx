import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Flame,
  DollarSign,
  Package,
  Zap,
  Timer,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getPromotionInstanceById,
  getTempsRestant,
} from "@/utils/promotionToolkit";

/**
 * Formater le temps restant en DD:HH:MM:SS
 */
const formatCountdown = (secondes) => {
  if (secondes <= 0) return "00:00:00:00";
  const jours = Math.floor(secondes / 86400);
  const heures = Math.floor((secondes % 86400) / 3600);
  const minutes = Math.floor((secondes % 3600) / 60);
  const secs = secondes % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(jours)}:${pad(heures)}:${pad(minutes)}:${pad(secs)}`;
};

const MenuCard = ({
  menu,
  onEdit,
  onDelete,
  onToggleStatut,
  canUpdate,
  canDelete,
  MENU_TYPE_LABELS,
  MENU_STATUT_LABELS,
  MENU_STATUTS,
  viewMode = "grid",
  isMobile = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [promoInstance, setPromoInstance] = useState(null);
  const [tempsRestant, setTempsRestant] = useState(0);

  const isDisponible = menu.statut === MENU_STATUTS.DISPONIBLE;
  const isPersonnalise = menu.nom?.toLowerCase().includes("personnalisé");

  // Charger les données de la promotion si menu promo
  useEffect(() => {
    if (menu.is_promo && menu.promotion_id) {
      getPromotionInstanceById(menu.promotion_id).then(({ instance }) => {
        if (instance) setPromoInstance(instance);
      });
    }
  }, [menu.is_promo, menu.promotion_id]);

  // Compte à rebours pour les menus promo
  useEffect(() => {
    if (!promoInstance?.date_fin) return;

    const update = () => setTempsRestant(getTempsRestant(promoInstance));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [promoInstance]);

  const handleToggle = (menuId, statut) => {
    if (menu.prix === 0 && !isDisponible && !isPersonnalise) {
      toast.warning("Activation impossible", {
        description: `Le menu "${menu.nom}" a un prix de 0 FCFA. Un menu gratuit ne peut pas être rendu disponible.`,
      });
      return;
    }
    onToggleStatut(menuId, statut);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="h-full">
      {viewMode === "list" ? (
        // VUE LISTE - Image à gauche, détails à droite
        <Card
          className={`h-full flex flex-row overflow-hidden transition-all hover:shadow-lg pl-4 ${
            !isDisponible ? "opacity-70" : ""
          }`}>
          {/* Image à gauche */}
          <div className="relative w-[20%] min-w-[20%] flex-shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden p-2">
            {menu.image_url && !imageError ? (
              <img
                src={menu.image_url}
                alt={menu.nom}
                className="w-full h-full object-cover rounded-lg transition-transform hover:scale-110 duration-300"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Contenu à droite */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="line-clamp-1 text-base">
                    {menu.nom}
                  </CardTitle>
                  <CardDescription className="line-clamp-1 text-xs">
                    {menu.description}
                  </CardDescription>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {menu.is_promo && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                      <Zap className="w-3 h-3 mr-0.5" />
                      Promo
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="backdrop-blur-sm bg-background/80 text-xs">
                    {MENU_TYPE_LABELS[menu.type]}
                  </Badge>
                  <Badge
                    variant={isDisponible ? "default" : "destructive"}
                    className="backdrop-blur-sm text-xs">
                    {MENU_STATUT_LABELS[menu.statut]}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-2 py-2">
              {/* Prix */}
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-semibold text-sm">
                  {menu.prix.toLocaleString()} FCFA
                </span>
              </div>

              {/* Calories */}
              {menu.indice_calorique && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Flame className="w-3 h-3 flex-shrink-0" />
                  <span>
                    {menu.indice_calorique.calorie} cal (
                    {menu.indice_calorique.joule} J)
                  </span>
                </div>
              )}

              {/* Compte à rebours promo (vue liste) */}
              {menu.is_promo && promoInstance && (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  tempsRestant <= 0 ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                }`}>
                  <Timer className="w-3 h-3 flex-shrink-0" />
                  <span className="font-mono">
                    {tempsRestant <= 0 ? "Expirée" : formatCountdown(tempsRestant)}
                  </span>
                </div>
              )}

              {/* Ingrédients */}
              {menu.ingredients && menu.ingredients.length > 0 && (
                <div className="text-xs">
                  <p className="text-muted-foreground mb-1">Ingrédients:</p>
                  <div className="flex flex-wrap gap-1">
                    {menu.ingredients.slice(0, 2).map((ingredient, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {ingredient}
                      </Badge>
                    ))}
                    {menu.ingredients.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{menu.ingredients.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>

            {/* Actions */}
            <CardFooter className="flex gap-2 pt-2 border-t">
              {canUpdate && (
                <>
                  <Button
                    size="sm"
                    variant={isDisponible ? "outline" : "default"}
                    className="flex-1 text-xs"
                    onClick={() => handleToggle(menu.id, menu.statut)}>
                    {isDisponible ? (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Masquer
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Activer
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(menu)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                </>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(menu)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </CardFooter>
          </div>
        </Card>
      ) : (
        // VUE GRILLE - Image en haut (50% de la hauteur), détails en bas
        <Card
          className={`${isMobile ? "h-[360px]" : "h-[420px]"} flex flex-col overflow-hidden transition-all hover:shadow-lg ${
            !isDisponible ? "opacity-70" : ""
          }`}>
          {/* Image - 35% de la hauteur de la card */}
          <div className={`relative h-[35%] bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden ${isMobile ? "m-2 mb-0" : "m-3 mb-0"} rounded-xl`}>
            {menu.image_url && !imageError ? (
              <img
                src={menu.image_url}
                alt={menu.nom}
                className="w-full h-full object-cover rounded-lg transition-transform hover:scale-105 duration-300"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}

            {/* Badge type */}
            <div className="absolute top-3 left-3 flex gap-1">
              {menu.is_promo && (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Zap className="w-3 h-3 mr-0.5" />
                  Promo
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="backdrop-blur-sm bg-background/80">
                {MENU_TYPE_LABELS[menu.type]}
              </Badge>
            </div>

            {/* Badge statut */}
            <div className="absolute top-3 right-3">
              <Badge
                variant={isDisponible ? "default" : "destructive"}
                className="backdrop-blur-sm">
                {MENU_STATUT_LABELS[menu.statut]}
              </Badge>
            </div>
          </div>

          {/* Contenu - Partie inférieure 50% */}
          <div className={`flex-1 flex flex-col ${isMobile ? "px-2 pt-2 pb-2" : "px-3 pt-3 pb-3"} min-h-0`}>
            <div className="flex-1 min-h-0 overflow-hidden">
              <h3 className="font-semibold line-clamp-1 text-base">{menu.nom}</h3>
              <p className="text-muted-foreground text-sm line-clamp-1 mt-0.5">
                {menu.description}
              </p>

              {/* Prix et Calories sur la même ligne */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="font-semibold">
                    {menu.prix.toLocaleString()} FCFA
                  </span>
                </div>
                {menu.indice_calorique && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Flame className="w-3 h-3" />
                    <span>{menu.indice_calorique.calorie} cal</span>
                  </div>
                )}
              </div>

              {/* Compte à rebours promo (vue grille) */}
              {menu.is_promo && promoInstance && (
                <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${
                  tempsRestant <= 0 ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                }`}>
                  <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-mono">
                    {tempsRestant <= 0 ? "Expirée" : formatCountdown(tempsRestant)}
                  </span>
                </div>
              )}

              {/* Ingrédients */}
              {menu.ingredients && menu.ingredients.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {menu.ingredients.slice(0, 3).map((ingredient, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {ingredient}
                      </Badge>
                    ))}
                    {menu.ingredients.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{menu.ingredients.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 mt-auto border-t">
              {canUpdate && (
                <>
                  <Button
                    size="sm"
                    variant={isDisponible ? "outline" : "default"}
                    className="flex-1"
                    onClick={() => handleToggle(menu.id, menu.statut)}>
                    {isDisponible ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        Masquer
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        Activer
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(menu)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(menu)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
};

export default MenuCard;
