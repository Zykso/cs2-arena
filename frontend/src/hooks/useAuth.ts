import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '../api';

export function useAuth() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: auth.me,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: auth.logout,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });

  return {
    user: data?.user ?? null,
    isLoading,
    logout: logoutMutation.mutate,
    isAdmin: data?.user?.role === 'admin' || data?.user?.role === 'superadmin',
  };
}
