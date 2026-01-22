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
} from "lucide-react";
import { useState } from "react";

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

  const isDisponible = menu.statut === MENU_STATUTS.DISPONIBLE;

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
          <div className="relative w-[30%] min-w-[30%] flex-shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden p-2">
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
                    onClick={() => onToggleStatut(menu.id, menu.statut)}>
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
          {/* Image - 50% de la hauteur de la card */}
          <div className={`relative h-[50%] bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden ${isMobile ? "m-2 mb-0" : "m-3 mb-0"} rounded-xl`}>
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
            <div className="absolute top-3 left-3">
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
                    onClick={() => onToggleStatut(menu.id, menu.statut)}>
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
