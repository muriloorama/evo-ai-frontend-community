import AttachmentTags, {
  AttachmentTag,
} from '@/pages/Customer/Agents/Agent/sections/AttachmentTags';

interface AttachmentTagsTabProps {
  tags: AttachmentTag[];
  onChange: (tags: AttachmentTag[]) => void;
}

export const AttachmentTagsTab = ({ tags, onChange }: AttachmentTagsTabProps) => {
  return <AttachmentTags tags={tags} onChange={onChange} />;
};
