import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { PracticeAccess } from '@/lib/practiceAccess';

export function usePracticeAccess() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['practice-access', user?.id],
    enabled: !!user,
    staleTime: 15000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_practice_access');
      if (error) throw error;
      return data as unknown as PracticeAccess;
    },
  });
}