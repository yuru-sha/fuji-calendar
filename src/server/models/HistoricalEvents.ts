import { 
  HistoricalEventResponse, 
  HistoricalStats, 
  MonthlyHistoricalSummary,
  HistoricalSearchOptions
} from '../../shared/types';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

// import { getDatabase } from '../database/connection'; // PostgreSQL移行により無効化

export class HistoricalEventsModel {
  // private db: Database; // PostgreSQL移行により無効化
  private logger: StructuredLogger;

  constructor() {
    // this.db = getDatabase().getRawDb(); // PostgreSQL移行により無効化
    this.logger = getComponentLogger('historical-events');
  }

  async archiveEventsFromCache(year: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO historical_events (
          location_id, year, month, day, event_type, sub_type,
          event_time, azimuth, elevation, moon_phase,
          calculation_accuracy, data_source, archived_at
        )
        SELECT 
          ec.location_id,
          ec.year,
          ec.month,
          json_extract(event_data.value, '$.day') as day,
          json_extract(event_data.value, '$.type') as event_type,
          json_extract(event_data.value, '$.subType') as sub_type,
          json_extract(event_data.value, '$.time') as event_time,
          json_extract(event_data.value, '$.azimuth') as azimuth,
          json_extract(event_data.value, '$.elevation') as elevation,
          json_extract(event_data.value, '$.moonPhase') as moon_phase,
          1.0 as calculation_accuracy,
          'calculated' as data_source,
          datetime('now', '+9 hours') as archived_at
        FROM events_cache ec,
        json_each(ec.events_data, '$.events') as event_data
        WHERE ec.year = ? AND ec.is_valid = 1
      `;

      this.db.run(sql, [year], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes || 0);
        }
      });
    });
  }

  async search(options: HistoricalSearchOptions): Promise<{
    events: HistoricalEventResponse[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      locationId,
      yearStart,
      yearEnd,
      eventType,
      subType,
      photoSuccessOnly,
      minVisibility,
      dataSource,
      limit = 50,
      offset = 0
    } = options;

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (locationId) {
      whereConditions.push('location_id = ?');
      params.push(locationId);
    }

    if (yearStart) {
      whereConditions.push('year >= ?');
      params.push(yearStart);
    }

    if (yearEnd) {
      whereConditions.push('year <= ?');
      params.push(yearEnd);
    }

    if (eventType) {
      whereConditions.push('event_type = ?');
      params.push(eventType);
    }

    if (subType) {
      whereConditions.push('sub_type = ?');
      params.push(subType);
    }

    if (photoSuccessOnly) {
      whereConditions.push('photo_success_reported = TRUE');
    }

    if (minVisibility) {
      whereConditions.push('visibility_rating >= ?');
      params.push(minVisibility);
    }

    if (dataSource) {
      whereConditions.push('data_source = ?');
      params.push(dataSource);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const countSql = `
      SELECT COUNT(*) as total FROM historical_events ${whereClause}
    `;

    const dataSql = `
      SELECT * FROM historical_events 
      ${whereClause}
      ORDER BY year DESC, month DESC, day DESC, event_time DESC
      LIMIT ? OFFSET ?
    `;

    return new Promise((resolve, reject) => {
      this.db.get(countSql, params, (err, countRow: any) => {
        if (err) {
          reject(err);
          return;
        }

        const total = countRow.total;

        this.db.all(dataSql, [...params, limit, offset], (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          const events: HistoricalEventResponse[] = rows.map(row => ({
            id: row.id,
            locationId: row.location_id,
            year: row.year,
            month: row.month,
            day: row.day,
            eventType: row.event_type,
            subType: row.sub_type,
            eventTime: row.event_time,
            azimuth: row.azimuth,
            elevation: row.elevation,
            moonPhase: row.moon_phase,
            weatherCondition: row.weather_condition,
            visibilityRating: row.visibility_rating,
            photoSuccessReported: row.photo_success_reported === 1,
            calculationAccuracy: row.calculation_accuracy,
            dataSource: row.data_source,
            notes: row.notes,
            archivedAt: row.archived_at,
            createdAt: row.created_at
          }));

          resolve({
            events,
            total,
            hasMore: offset + limit < total
          });
        });
      });
    });
  }

  async getYearlyStats(locationId?: number, eventType?: 'diamond' | 'pearl'): Promise<HistoricalStats[]> {
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (locationId) {
      whereConditions.push('location_id = ?');
      params.push(locationId);
    }

    if (eventType) {
      whereConditions.push('event_type = ?');
      params.push(eventType);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const sql = `
      SELECT * FROM historical_events_stats 
      ${whereClause}
      ORDER BY location_id, year DESC, event_type, sub_type
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const stats: HistoricalStats[] = rows.map(row => ({
          locationId: row.location_id,
          year: row.year,
          eventType: row.event_type,
          subType: row.sub_type,
          totalEvents: row.total_events,
          successfulPhotos: row.successful_photos,
          successRatePercent: row.success_rate_percent,
          avgVisibility: row.avg_visibility,
          earliestEvent: row.earliest_event,
          latestEvent: row.latest_event
        }));

        resolve(stats);
      });
    });
  }

  async getMonthlyHistory(
    locationId: number, 
    year?: number, 
    eventType?: 'diamond' | 'pearl'
  ): Promise<MonthlyHistoricalSummary[]> {
    const whereConditions: string[] = ['location_id = ?'];
    const params: any[] = [locationId];

    if (year) {
      whereConditions.push('year = ?');
      params.push(year);
    }

    if (eventType) {
      whereConditions.push('event_type = ?');
      params.push(eventType);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const sql = `
      SELECT * FROM monthly_historical_summary 
      ${whereClause}
      ORDER BY year DESC, month DESC, event_type
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const summaries: MonthlyHistoricalSummary[] = rows.map(row => ({
          locationId: row.location_id,
          year: row.year,
          month: row.month,
          eventType: row.event_type,
          eventCount: row.event_count,
          successCount: row.success_count,
          avgVisibility: row.avg_visibility,
          eventDays: row.event_days ? row.event_days.split(',').map(Number) : []
        }));

        resolve(summaries);
      });
    });
  }

  async reportPhotoSuccess(
    eventId: number, 
    visibilityRating: number,
    weatherCondition?: string,
    notes?: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE historical_events 
        SET 
          photo_success_reported = TRUE,
          visibility_rating = ?,
          weather_condition = COALESCE(?, weather_condition),
          notes = COALESCE(?, notes),
          created_at = datetime('now', '+9 hours')
        WHERE id = ?
      `;

      this.db.run(sql, [visibilityRating, weatherCondition, notes, eventId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  async addObservedEvent(
    locationId: number,
    year: number,
    month: number,
    day: number,
    eventType: 'diamond' | 'pearl',
    subType: 'sunrise' | 'sunset',
    eventTime: Date,
    azimuth?: number,
    elevation?: number,
    moonPhase?: number,
    weatherCondition?: string,
    visibilityRating?: number,
    photoSuccessReported: boolean = false,
    dataSource: 'observed' | 'reported' = 'observed',
    notes?: string
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO historical_events (
          location_id, year, month, day, event_type, sub_type,
          event_time, azimuth, elevation, moon_phase,
          weather_condition, visibility_rating, photo_success_reported,
          calculation_accuracy, data_source, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        locationId, year, month, day, eventType, subType,
        eventTime.toISOString(), azimuth || 0, elevation || 0, moonPhase,
        weatherCondition, visibilityRating, photoSuccessReported,
        0.8, dataSource, notes
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID || 0);
        }
      });
    });
  }

  async deleteOldData(yearsOld: number): Promise<number> {
    const cutoffYear = new Date().getFullYear() - yearsOld;
    
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM historical_events WHERE year < ?`;
      
      this.db.run(sql, [cutoffYear], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes || 0);
        }
      });
    });
  }

  async getDataCount(): Promise<{
    totalEvents: number;
    successfulPhotos: number;
    yearsSpan: number;
    locations: number;
  }> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN photo_success_reported = TRUE THEN 1 END) as successful_photos,
          (MAX(year) - MIN(year) + 1) as years_span,
          COUNT(DISTINCT location_id) as locations
        FROM historical_events
      `;

      this.db.get(sql, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            totalEvents: row.total_events || 0,
            successfulPhotos: row.successful_photos || 0,
            yearsSpan: row.years_span || 0,
            locations: row.locations || 0
          });
        }
      });
    });
  }
}