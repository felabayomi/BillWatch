import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@finance/components/ui/card";
import { Button } from "@finance/components/ui/button";
import { Input } from "@finance/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@finance/components/ui/select";
import { useToast } from "@finance/hooks/use-toast";
import { apiRequest } from "@finance/lib/queryClient";
import { Link2, Trash2, Copy, Check, Users, Shield, Eye, Building2, User, Calendar, Filter } from "lucide-react";
import { type AccountantLink } from "@finance-shared/schema";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = ["all", ...Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i))];

export function AccountantSharePanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [label, setLabel] = useState("Tax Preparer View");
  const [filterType, setFilterType] = useState<"all" | "business" | "personal">("all");
  const [filterYear, setFilterYear] = useState<string>(String(CURRENT_YEAR));
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery<AccountantLink[]>({
    queryKey: ["/api/finance/accountant-link"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/finance/accountant-link", { label, filterType, filterYear }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/accountant-link"] });
      toast({ title: "Link created", description: "Share this link with your accountant or tax preparer." });
    },
    onError: () => toast({ title: "Error", description: "Could not create link.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (token: string) => apiRequest("DELETE", `/api/finance/accountant-link/${token}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/accountant-link"] });
      toast({ title: "Link revoked", description: "The link is no longer accessible." });
    },
    onError: () => toast({ title: "Error", description: "Could not revoke link.", variant: "destructive" }),
  });

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/accountant/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const typeLabel = (t: string) =>
    t === "business" ? "Business Only" : t === "personal" ? "Personal Only" : "All Transactions";

  const yearLabel = (y: string) => y === "all" ? "All Years" : y;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-blue-600" />
            Share with Your Accountant or Tax Preparer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <Eye className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Read Only</p>
                <p className="text-green-700 text-xs mt-0.5">They can view transactions and open receipts â€” but cannot edit, delete, or change anything.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-blue-800">Scoped Access</p>
                <p className="text-blue-700 text-xs mt-0.5">The link only shows the year and transaction type you choose here. They cannot see anything beyond that.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <Link2 className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-purple-800">Revocable</p>
                <p className="text-purple-700 text-xs mt-0.5">Delete any link at any time to immediately cut off access.</p>
              </div>
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-muted/30 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Choose what to share before generating the link
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Link Label</label>
                <Input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. My CPA â€“ 2025 Taxes"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Year
                </label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => (
                      <SelectItem key={y} value={y}>{y === "all" ? "All Years" : y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Transaction Type
                </label>
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="business">Business Only</SelectItem>
                    <SelectItem value="personal">Personal Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                This link will show: <strong>{yearLabel(filterYear)}</strong> &bull; <strong>{typeLabel(filterType)}</strong>
              </p>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                <Link2 className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Creating..." : "Generate Link"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Links</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && links.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No links created yet. Generate one above to share with your accountant.</p>
          )}
          <div className="space-y-3">
            {links.map(link => {
              const url = `${window.location.origin}/accountant/${link.token}`;
              const isCopied = copiedToken === link.token;
              return (
                <div key={link.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{link.label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        <Calendar className="h-2.5 w-2.5" />
                        {link.filterYear === "all" ? "All Years" : link.filterYear}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        {link.filterType === "business" ? <Building2 className="h-2.5 w-2.5" /> : link.filterType === "personal" ? <User className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                        {typeLabel(link.filterType)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">{url}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(link.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => copyLink(link.token)}>
                      {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="ml-1.5 text-xs">{isCopied ? "Copied!" : "Copy Link"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteMutation.mutate(link.token)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
