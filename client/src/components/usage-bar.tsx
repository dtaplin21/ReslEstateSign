interface UsageBarProps {
  label: string;
  current: number;
  limit: number;
}

export function UsageBar({ label, current, limit }: UsageBarProps) {
  const percentage = Math.min(Math.round((current / limit) * 100), 100);
  
  // Determine color based on usage percentage
  const getColorClass = () => {
    if (percentage >= 95) return "bg-destructive";
    if (percentage >= 80) return "bg-orange-500";
    return "bg-primary";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground" data-testid={`usage-text-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
          data-testid={`usage-bar-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{percentage}% used</span>
        <span className="text-muted-foreground">
          {(limit - current).toLocaleString()} remaining
        </span>
      </div>
    </div>
  );
}
