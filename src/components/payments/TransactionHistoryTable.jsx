import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Tableau d'historique des transactions
 */
const TransactionHistoryTable = ({ transactions, loading, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filtrage des transactions
  const filteredTransactions = transactions?.filter((transaction) => {
    const matchesSearch =
      transaction.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Badge de statut
  const getStatusBadge = (status) => {
    const variants = {
      success: "default",
      pending: "secondary",
      failed: "destructive",
      cancelled: "outline",
    };

    const labels = {
      success: "Réussi",
      pending: "En attente",
      failed: "Échoué",
      cancelled: "Annulé",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Formater le montant
  const formatAmount = (amount, currency = "XOF") => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency === "XOF" ? "XOF" : "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Export CSV
  const handleExport = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      alert("Aucune transaction à exporter");
      return;
    }

    const headers = [
      "ID Transaction",
      "Provider",
      "Montant",
      "Devise",
      "Statut",
      "Méthode",
      "Téléphone",
      "Email",
      "Mode",
      "Date",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredTransactions.map((t) =>
        [
          t.transaction_id,
          t.provider_name,
          t.amount,
          t.currency,
          t.status,
          t.payment_method || "",
          t.customer_phone || "",
          t.customer_email || "",
          t.is_sandbox ? "Sandbox" : "Production",
          format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Historique des transactions</CardTitle>
            <CardDescription>
              {filteredTransactions?.length || 0} transaction(s) trouvée(s)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par ID, téléphone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="success">Réussi</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tableau */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Transaction</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions?.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-sm">
                      {transaction.transaction_id?.substring(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.payment_providers?.display_name || transaction.provider_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell>{transaction.payment_method || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {transaction.customer_phone || transaction.customer_email || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.is_sandbox ? "secondary" : "destructive"}>
                        {transaction.is_sandbox ? "Sandbox" : "Prod"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(transaction.created_at), "dd MMM yyyy HH:mm", {
                        locale: fr,
                      })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucune transaction trouvée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionHistoryTable;
