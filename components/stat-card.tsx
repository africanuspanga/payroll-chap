type StatCardProps = {
  label: string;
  value: string;
  trend?: string;
};

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <article className="pc-card pc-animate">
      <p className="pc-label">{label}</p>
      <p className="pc-value">{value}</p>
      {trend ? <p className="pc-trend">{trend}</p> : null}
    </article>
  );
}
