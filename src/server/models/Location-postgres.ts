import { getUnifiedDatabase, UnifiedDatabase } from '../database/connection-unified';
import { Location, CreateLocationRequest } from '../../shared/types';
import { astronomicalCalculator } from '../services/AstronomicalCalculatorAstronomyEngine';

export class LocationModel {
  private db: UnifiedDatabase;

  constructor() {
    this.db = getUnifiedDatabase();
  }

  // 全ての撮影地点を取得
  async findAll(): Promise<Location[]> {
    const sql = `
      SELECT 
        id, name, prefecture, latitude, longitude, elevation,
        description, access_info as accessInfo, warnings,
        fuji_azimuth as fujiAzimuth, fuji_elevation as fujiElevation, fuji_distance as fujiDistance,
        created_at as createdAt,
        updated_at as updatedAt
      FROM locations 
      ORDER BY prefecture, name
    `;
    
    const rows = await this.db.allAdapted<any>(sql);
    return rows.map(this.mapRowToLocation);
  }

  // IDで撮影地点を取得
  async findById(id: number): Promise<Location | null> {
    const sql = `
      SELECT 
        id, name, prefecture, latitude, longitude, elevation,
        description, access_info as accessInfo, warnings,
        fuji_azimuth as fujiAzimuth, fuji_elevation as fujiElevation, fuji_distance as fujiDistance,
        created_at as createdAt,
        updated_at as updatedAt
      FROM locations 
      WHERE id = ?
    `;
    
    const row = await this.db.getAdapted<any>(sql, [id]);
    return row ? this.mapRowToLocation(row) : null;
  }

  // 県名で撮影地点を検索
  async findByPrefecture(prefecture: string): Promise<Location[]> {
    const sql = `
      SELECT 
        id, name, prefecture, latitude, longitude, elevation,
        description, access_info as accessInfo, warnings,
        fuji_azimuth as fujiAzimuth, fuji_elevation as fujiElevation, fuji_distance as fujiDistance,
        created_at as createdAt,
        updated_at as updatedAt
      FROM locations 
      WHERE prefecture = ?
      ORDER BY name
    `;
    
    const rows = await this.db.allAdapted<any>(sql, [prefecture]);
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
        created_at as createdAt,
        updated_at as updatedAt
      FROM locations 
      WHERE latitude BETWEEN ? AND ? 
        AND longitude BETWEEN ? AND ?
      ORDER BY prefecture, name
    `;
    
    const rows = await this.db.allAdapted<any>(sql, [minLat, maxLat, minLng, maxLng]);
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
        fuji_azimuth, fuji_elevation, fuji_distance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, name, prefecture, latitude, longitude, elevation,
               description, access_info as accessInfo, warnings,
               fuji_azimuth as fujiAzimuth, fuji_elevation as fujiElevation, fuji_distance as fujiDistance,
               created_at as createdAt, updated_at as updatedAt
    `;
    
    const params = [
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
    ];

    try {
      const dbType = process.env.DB_TYPE || 'sqlite';
      
      if (dbType === 'postgres') {
        const result = await this.db.queryAdapted<any>(sql, params);
        return this.mapRowToLocation(result.rows![0]);
      } else {
        // SQLite用の処理
        const insertResult = await this.db.runAdapted(sql.replace('RETURNING.*', ''), params);
        const insertedId = insertResult.lastID!;
        return await this.findById(insertedId) as Location;
      }
    } catch (error) {
      console.error('Location creation error:', error);
      throw error;
    }
  }

  // 撮影地点を更新
  async update(id: number, locationData: Partial<CreateLocationRequest>): Promise<Location | null> {
    const existingLocation = await this.findById(id);
    if (!existingLocation) {
      return null;
    }

    // 座標が変更された場合は事前計算値を再計算
    let fujiAzimuth = existingLocation.fujiAzimuth;
    let fujiElevation = existingLocation.fujiElevation;
    let fujiDistance = existingLocation.fujiDistance;

    if (locationData.latitude !== undefined || locationData.longitude !== undefined) {
      const tempLocation: Location = {
        ...existingLocation,
        ...locationData,
        latitude: locationData.latitude ?? existingLocation.latitude,
        longitude: locationData.longitude ?? existingLocation.longitude,
        elevation: locationData.elevation ?? existingLocation.elevation
      };
      
      fujiAzimuth = astronomicalCalculator.calculateBearingToFuji(tempLocation);
      fujiElevation = astronomicalCalculator.calculateElevationToFuji(tempLocation);
      fujiDistance = astronomicalCalculator.calculateDistanceToFuji(tempLocation);
    }

    const sql = `
      UPDATE locations SET
        name = COALESCE(?, name),
        prefecture = COALESCE(?, prefecture),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        elevation = COALESCE(?, elevation),
        description = ?,
        access_info = ?,
        warnings = ?,
        fuji_azimuth = ?,
        fuji_elevation = ?,
        fuji_distance = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      locationData.name,
      locationData.prefecture,
      locationData.latitude,
      locationData.longitude,
      locationData.elevation,
      locationData.description,
      locationData.accessInfo,
      locationData.warnings,
      fujiAzimuth,
      fujiElevation,
      fujiDistance,
      id
    ];

    await this.db.runAdapted(sql, params);
    return await this.findById(id);
  }

  // 撮影地点を削除
  async delete(id: number): Promise<boolean> {
    const sql = 'DELETE FROM locations WHERE id = ?';
    const result = await this.db.runAdapted(sql, [id]);
    
    // SQLiteとPostgreSQLの戻り値の違いに対応
    const dbType = process.env.DB_TYPE || 'sqlite';
    if (dbType === 'postgres') {
      return (result.rowCount || 0) > 0;
    } else {
      return (result.changes || 0) > 0;
    }
  }

  // 距離による近隣地点検索
  async findNearbyLocations(latitude: number, longitude: number, radiusKm: number = 50): Promise<Location[]> {
    // 簡易的な矩形範囲での検索（高精度なPostGIS使用時はST_DWithin使用推奨）
    const latDelta = radiusKm / 111; // 1度 ≈ 111km
    const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

    return await this.findByCoordinateRange(
      latitude - latDelta,
      latitude + latDelta,
      longitude - lngDelta,
      longitude + lngDelta
    );
  }

  // 統計情報を取得
  async getStatistics(): Promise<{
    totalLocations: number;
    locationsByPrefecture: Array<{ prefecture: string; count: number }>;
    averageElevation: number;
    averageDistanceToFuji: number;
  }> {
    const totalSql = 'SELECT COUNT(*) as count FROM locations';
    const totalResult = await this.db.getAdapted<{ count: number }>(totalSql);

    const prefectureSql = `
      SELECT prefecture, COUNT(*) as count 
      FROM locations 
      GROUP BY prefecture 
      ORDER BY count DESC
    `;
    const prefectureResults = await this.db.allAdapted<{ prefecture: string; count: number }>(prefectureSql);

    const avgSql = `
      SELECT 
        AVG(elevation) as avgElevation,
        AVG(fuji_distance) as avgDistance
      FROM locations
    `;
    const avgResult = await this.db.getAdapted<{ avgElevation: number; avgDistance: number }>(avgSql);

    return {
      totalLocations: totalResult?.count || 0,
      locationsByPrefecture: prefectureResults,
      averageElevation: avgResult?.avgElevation || 0,
      averageDistanceToFuji: avgResult?.avgDistance || 0
    };
  }

  // 行データをLocationオブジェクトにマッピング
  private mapRowToLocation(row: any): Location {
    return {
      id: row.id,
      name: row.name,
      prefecture: row.prefecture,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      elevation: parseFloat(row.elevation),
      description: row.description,
      accessInfo: row.accessinfo || row.accessInfo,
      warnings: row.warnings,
      fujiAzimuth: row.fujiazimuth ? parseFloat(row.fujiazimuth) : row.fujiAzimuth,
      fujiElevation: row.fujielevation ? parseFloat(row.fujielevation) : row.fujiElevation,
      fujiDistance: row.fujidistance ? parseFloat(row.fujidistance) : row.fujiDistance,
      createdAt: row.createdat || row.createdAt,
      updatedAt: row.updatedat || row.updatedAt
    };
  }
}