import type { DayScore } from '../api/activityForecast.ts'
import { formatDate } from '../format/date.ts'

type Props = {
  day: DayScore
  isBest: boolean
}

/** Points lost to a factor: what it would add at full marks minus what it adds. */
function pointsLost(weight: number, subScore: number): number {
  return Math.round(weight * (1 - subScore) * 100)
}

function formatPointsLost(points: number): string {
  return points === 0 ? '-' : `−${points} pts`
}

function DayRow({ day, isBest }: Props) {
  return (
    <li className={isBest ? 'day best' : 'day'}>
      <div className="day-summary">
        <span className="day-date">{formatDate(day.date)}</span>
        {day.missingData ? (
          <span className="day-note" title={day.missingData}>
            No forecast data
          </span>
        ) : day.gate ? (
          <span className="day-note gated">{day.gate}</span>
        ) : (
          <span className="day-score">
            {Math.round(day.score ?? 0)}
            {day.penalty && <span className="day-penalty"> {day.penalty}</span>}
          </span>
        )}
        {isBest && <span className="badge">Best day</span>}
      </div>
      {day.factors.length > 0 && (
        <details>
          {/* A gate overrides the weighted sum, so points lost wouldn't explain the day. */}
          <summary>{day.gate ? 'Conditions' : 'Why this score'}</summary>
          <ul className="factors">
            {day.factors.map((factor) => (
              <li key={factor.name}>
                <span>
                  {factor.name}: {factor.detail}
                </span>
                {!day.gate && (
                  <span className="points">
                    {formatPointsLost(pointsLost(factor.weight, factor.subScore))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  )
}

export default DayRow
