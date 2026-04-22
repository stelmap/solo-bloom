import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Determines whether the user has completed *any* finance setup.
 * Setup is "complete" if they have at least one expense, income entry,
 * or break-even goal — meaning they've engaged with the Finances area.
 */
export function useFinanceSetupStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["finance-setup-status", user?.id],
    queryFn: async () => {
      const [expenses, income, goals] = await Promise.all([
        supabase.from("expenses").select("id", { count: "exact", head: true }),
        supabase.from("income").select("id", { count: "exact", head: true }),
        supabase.from("breakeven_goals").select("id", { count: "exact", head: true }),
      ]);
      const expenseCount = expenses.count ?? 0;
      const incomeCount = income.count ?? 0;
      const goalCount = goals.count ?? 0;
      return {
        completed: expenseCount > 0 || incomeCount > 0 || goalCount > 0,
        expenseCount,
        incomeCount,
        goalCount,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
