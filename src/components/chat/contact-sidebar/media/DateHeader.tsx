interface DateHeaderProps {
  label: string;
  first?: boolean;
}

const DateHeader = ({ label, first = false }: DateHeaderProps) => (
  <h3
    className={`text-base font-semibold text-foreground ${first ? 'mt-1' : 'mt-5'} mb-2 px-4`}
  >
    {label}
  </h3>
);

export default DateHeader;
