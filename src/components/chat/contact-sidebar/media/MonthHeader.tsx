interface MonthHeaderProps {
  label: string;
  /** Primeiro grupo do modal? Se sim, sem margem-top extra. */
  first?: boolean;
}

const MonthHeader = ({ label, first = false }: MonthHeaderProps) => (
  <h3
    className={`text-lg font-bold text-foreground ${first ? 'mt-2' : 'mt-6'} mb-3 px-4`}
  >
    {label}
  </h3>
);

export default MonthHeader;
