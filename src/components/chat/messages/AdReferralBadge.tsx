import React from 'react';
import { Instagram, Facebook, Megaphone } from 'lucide-react';

interface AdReferralBadgeProps {
  sourceType: string;
  sourceLabel?: string | null;
}

const AdReferralBadge: React.FC<AdReferralBadgeProps> = ({ sourceType, sourceLabel }) => {
  const isInstagram = sourceType === 'instagram_ad';
  const isMeta = sourceType === 'meta_ad';
  if (!isInstagram && !isMeta) return null;

  const Icon = isInstagram ? Instagram : isMeta ? Facebook : Megaphone;
  const label = sourceLabel || (isInstagram ? 'Instagram Ads' : 'Meta Ads');
  const color = isInstagram
    ? 'text-pink-600 bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800'
    : 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800';

  return (
    <div className="flex justify-start mb-1 ml-10">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${color}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    </div>
  );
};

export default AdReferralBadge;
