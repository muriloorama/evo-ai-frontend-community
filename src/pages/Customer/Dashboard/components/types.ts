export interface DashboardFilterState {
  pipelineId: string;
  teamId: string;
  inboxId: string;
  userId: string;
  // 'visitor' | 'lead' | 'customer' | '' (all)
  contactType: string;
  since: string;
  until: string;
}

export interface DashboardOption {
  id: string;
  name: string;
}
