// import { Database, getDatabase } from '../database/connection'; // PostgreSQL移行により無効化
import { Location, CreateLocationRequest } from '../../shared/types';
import { AstronomicalCalculatorImpl } from '../services/AstronomicalCalculator';

const astronomicalCalculator = new AstronomicalCalculatorImpl();

export class LocationModel {
  // private db: Database; // PostgreSQL移行により無効化

  constructor() {
    // this.db = getDatabase(); // PostgreSQL移行により無効化
    throw new Error('LocationModel は PostgreSQL 移行により現在使用できません。Prisma を使用してください。');
  }

  // 全ての撮影地点を取得
  async findAll(): Promise<Location[]> {
    const sql = `
      SELECT 
        id, name, prefecture, latitude, longitude, elevation,
        description, access_info as accessInfo, warnings,
        fuji_azimuth as fujiAzimuth, fuji_elevation as fujiElevation, fuji_distance as fujiDistance,
        datetime(created_at, 'localtime') as createdAt,
        datetime(updated_at, 'localtime') as updatedAt
      FROM locations 
      ORDER BY prefecture, name
    `;

    const rows = await this.db.all<any>(sql);
    return rows.map(this.mapRowToLocation);
  }

  // IDで撮影地点を取得
  async findById(id: number): Promise<Location | null> {
    const sql = `
      SELECT 
        id, name, prefecture, latitude, longitude, elevation,
        description, access_info as accessInfo, warnings,
        fuji_azimuth as fujiAzimuth, fuji_elevation as fujiElevation, fuji_distance as fujiDistance,
        datetime(created_at, 'localtime') as createdAt,
        datetime(updated_at, 'localtime') as updatedAt
      FROM locations 
      WHERE id = ?
    `;

    const row = await this.db.get<any>(sql, [id]);
    return row ? this.mapRowToLocation(row) : null;
  }

  // 県名で撮影地点を検索
  async findByPrefecture(prefecture: string): Promise<Location[]> {
    const sql = `
      SELECT 
        id, name, prefecture, latitude, longitude, elevation,
        description, access_info as accessInfo, warnings,
        fuji_azimuth as fujiAzimuth, fuji_elevation as fujiElevation, fuji_distance as fujiDistance,
        datetime(created_at, 'localtime') as createdAt,
        datetime(updated_at, 'localtime') as updatedAt
      FROM locations 
      WHERE prefecture = ?
      ORDER BY name
    `;

    const rows = await this.db.all<any>(sql, [prefecture]);
    return rows.map(this.mapRowToLocation);
  }

  // 座標範囲内の撮影地点を検索
  async findByCoordinateRange(
    minLat: number, maxLat: number,
    minLng: number, maxLng: number
  ): Promise<Location[]> {
    const sql = `
      SELECT 
        id, name, prefecture, latitude, longitude, elevation,
        description, access_info as accessInfo, warnings,
        fuji_azimuth as fujiAzimuth, fuji_elevation as fujiElevation, fuji_distance as fujiDistance,
        datetime(created_at, 'localtime') as createdAt,
        datetime(updated_at, 'localtime') as updatedAt
      FROM locations 
      WHERE latitude BETWEEN ? AND ? 
        AND longitude BETWEEN ? AND ?
      ORDER BY prefecture, name
    `;

    const rows = await this.db.all<any>(sql, [minLat, maxLat, minLng, maxLng]);
    return rows.map(this.mapRowToLocation);
  }

  // 新しい撮影地点を作成（事前計算値も同時に算出）
  async create(locationData: CreateLocationRequest): Promise<Location> {
    // 事前計算値を算出
    const tempLocation: Location = {
      id: 0,
      ...locationData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const fujiAzimuth = astronomicalCalculator.calculateBearingToFuji(tempLocation);
    const fujiElevation = astronomicalCalculator.calculateElevationToFuji(tempLocation);
    const fujiDistance = astronomicalCalculator.calculateDistanceToFuji(tempLocation);

    const sql = `
      INSERT INTO locations (
        name, prefecture, latitude, longitude, elevation,
        description, access_info, warnings,
        fuji_azimuth, fuji_elevation, fuji_distance,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
        datetime('now', '+9 hours'), 
        datetime('now', '+9 hours')
      )
    `;

    const result = await this.db.run(sql, [
      locationData.name,
      locationData.prefecture,
      locationData.latitude,
      locationData.longitude,
      locationData.elevation,
      locationData.description || null,
      locationData.accessInfo || null,
      locationData.warnings || null,
      fujiAzimuth,
      fujiElevation,
      fujiDistance
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create location');
    }

    const created = await this.findById(result.lastID);
    if (!created) {
      throw new Error('Failed to retrieve created location');
    }

    return created;
  }

  // 撮影地点を更新
  async update(id: number, locationData: Partial<CreateLocationRequest>): Promise<Location | null> {
    const existingLocation = await this.findById(id);
    if (!existingLocation) {
      return null;
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (locationData.name !== undefined) {
      fields.push('name = ?');
      values.push(locationData.name);
    }
    if (locationData.prefecture !== undefined) {
      fields.push('prefecture = ?');
      values.push(locationData.prefecture);
    }
    if (locationData.latitude !== undefined) {
      fields.push('latitude = ?');
      values.push(locationData.latitude);
    }
    if (locationData.longitude !== undefined) {
      fields.push('longitude = ?');
      values.push(locationData.longitude);
    }
    if (locationData.elevation !== undefined) {
      fields.push('elevation = ?');
      values.push(locationData.elevation);
    }
    if (locationData.description !== undefined) {
      fields.push('description = ?');
      values.push(locationData.description);
    }
    if (locationData.accessInfo !== undefined) {
      fields.push('access_info = ?');
      values.push(locationData.accessInfo);
    }
    if (locationData.warnings !== undefined) {
      fields.push('warnings = ?');
      values.push(locationData.warnings);
    }

    if (fields.length === 0) {
      return existingLocation;
    }

    fields.push('updated_at = datetime(\'now\', \'+9 hours\')');
    values.push(id);

    const sql = `UPDATE locations SET ${fields.join(', ')} WHERE id = ?`;
    await this.db.run(sql, values);

    return await this.findById(id);
  }

  // 撮影地点を削除
  async delete(id: number): Promise<boolean> {
    const sql = 'DELETE FROM locations WHERE id = ?';
    const result = await this.db.run(sql, [id]);
    return (result.changes || 0) > 0;
  }

  // 県名一覧を取得
  async getPrefectures(): Promise<string[]> {
    const sql = 'SELECT DISTINCT prefecture FROM locations ORDER BY prefecture';
    const rows = await this.db.all<{ prefecture: string }>(sql);
    return rows.map(row => row.prefecture);
  }

  // 事前計算値を更新（座標が変更された場合）
  async updatePreCalculatedValues(id: number): Promise<Location | null> {
    const location = await this.findById(id);
    if (!location) {
      return null;
    }

    const fujiAzimuth = astronomicalCalculator.calculateBearingToFuji(location);
    const fujiElevation = astronomicalCalculator.calculateElevationToFuji(location);
    const fujiDistance = astronomicalCalculator.calculateDistanceToFuji(location);

    const sql = `
      UPDATE locations 
      SET fuji_azimuth = ?, fuji_elevation = ?, fuji_distance = ?,
          updated_at = datetime('now', '+9 hours')
      WHERE id = ?
    `;

    await this.db.run(sql, [fujiAzimuth, fujiElevation, fujiDistance, id]);
    return await this.findById(id);
  }

  // 事前計算値が欠けている地点を検索
  async findLocationsWithoutPreCalculatedValues(): Promise<Location[]> {
    const sql = `
      SELECT 
        id, name, prefecture, latitude, longitude, elevation,
        description, access_info as accessInfo, warnings,
        fuji_azimuth as fujiAzimuth, fuji_elevation as fujiElevation, fuji_distance as fujiDistance,
        datetime(created_at, 'localtime') as createdAt,
        datetime(updated_at, 'localtime') as updatedAt
      FROM locations 
      WHERE fuji_azimuth IS NULL OR fuji_elevation IS NULL OR fuji_distance IS NULL
      ORDER BY prefecture, name
    `;

    const rows = await this.db.all<any>(sql);
    return rows.map(this.mapRowToLocation);
  }

  // 全地点の事前計算値を更新
  async recalculateAllPreCalculatedValues(): Promise<number> {
    const locations = await this.findAll();
    let updatedCount = 0;

    for (const location of locations) {
      try {
        await this.updatePreCalculatedValues(location.id);
        updatedCount++;
      } catch (error) {
        console.error(`Error updating location ${location.id}:`, error);
      }
    }

    return updatedCount;
  }

  // データベース行を Location オブジェクトにマッピング
  private mapRowToLocation(row: any): Location {
    return {
      id: row.id,
      name: row.name,
      prefecture: row.prefecture,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      elevation: Number(row.elevation),
      description: row.description || undefined,
      accessInfo: row.accessInfo || undefined,
      warnings: row.warnings || undefined,
      fujiAzimuth: row.fujiAzimuth || undefined,
      fujiElevation: row.fujiElevation || undefined,
      fujiDistance: row.fujiDistance || undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }
}

export default LocationModel;