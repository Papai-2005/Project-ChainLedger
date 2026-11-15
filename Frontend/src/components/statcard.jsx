import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import React from "react";
export default function StatCard({
  title,
  value,
  change,
  icon: Icon,
  positive = true
}) {
  return (
    <div className="stat-card">

      <div className="stat-top">

        <div className="stat-icon">
          <Icon size={20} />
        </div>

        <span className={
          positive
            ? "stat-change positive"
            : "stat-change negative"
        }>
          {positive
            ? <ArrowUpRight size={14} />
            : <ArrowDownRight size={14} />
          }

          {change}
        </span>

      </div>

      <p className="stat-title">{title}</p>

      <h2 className="stat-value">{value}</h2>

    </div>
  );
}