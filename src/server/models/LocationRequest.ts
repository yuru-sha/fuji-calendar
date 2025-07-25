// import { Database, getDatabase } from '../database/connection'; // PostgreSQL移行により無効化
import { LocationRequest, LocationRequestBody } from '../../shared/types';

export class LocationRequestModel {
  // private db: Database; // PostgreSQL移行により無効化

  constructor() {
    // this.db = getDatabase(); // PostgreSQL移行により無効化
    throw new Error('LocationRequestModel は PostgreSQL 移行により現在使用できません。');
  }

  // 全ての撮影地点リクエストを取得
  async findAll(): Promise<LocationRequest[]> {
    const sql = `
      SELECT 
        id, name, prefecture, description,
        suggested_latitude as suggestedLatitude,
        suggested_longitude as suggestedLongitude,
        requester_ip as requesterIp,
        status,
        datetime(created_at, 'localtime') as createdAt,
        datetime(processed_at, 'localtime') as processedAt,
        processed_by as processedBy
      FROM location_requests 
      ORDER BY created_at DESC
    `;
    
    const rows = await this.db.all<any>(sql);
    return rows.map(this.mapRowToLocationRequest);
  }

  // ステータス別のリクエストを取得
  async findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<LocationRequest[]> {
    const sql = `
      SELECT 
        id, name, prefecture, description,
        suggested_latitude as suggestedLatitude,
        suggested_longitude as suggestedLongitude,
        requester_ip as requesterIp,
        status,
        datetime(created_at, 'localtime') as createdAt,
        datetime(processed_at, 'localtime') as processedAt,
        processed_by as processedBy
      FROM location_requests 
      WHERE status = ?
      ORDER BY created_at DESC
    `;
    
    const rows = await this.db.all<any>(sql, [status]);
    return rows.map(this.mapRowToLocationRequest);
  }

  // IDでリクエストを取得
  async findById(id: number): Promise<LocationRequest | null> {
    const sql = `
      SELECT 
        id, name, prefecture, description,
        suggested_latitude as suggestedLatitude,
        suggested_longitude as suggestedLongitude,
        requester_ip as requesterIp,
        status,
        datetime(created_at, 'localtime') as createdAt,
        datetime(processed_at, 'localtime') as processedAt,
        processed_by as processedBy
      FROM location_requests 
      WHERE id = ?
    `;
    
    const row = await this.db.get<any>(sql, [id]);
    return row ? this.mapRowToLocationRequest(row) : null;
  }

  // 新しいリクエストを作成
  async create(requestData: LocationRequestBody, requesterIp: string): Promise<LocationRequest> {
    const sql = `
      INSERT INTO location_requests (
        name, prefecture, description,
        suggested_latitude, suggested_longitude,
        requester_ip, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'))
    `;
    
    const result = await this.db.run(sql, [
      requestData.name,
      requestData.prefecture,
      requestData.description,
      requestData.suggestedCoordinates?.latitude || null,
      requestData.suggestedCoordinates?.longitude || null,
      requesterIp
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create location request');
    }

    const created = await this.findById(result.lastID);
    if (!created) {
      throw new Error('Failed to retrieve created location request');
    }

    return created;
  }

  // リクエストのステータスを更新
  async updateStatus(
    id: number, 
    status: 'approved' | 'rejected', 
    processedBy: number
  ): Promise<LocationRequest | null> {
    const sql = `
      UPDATE location_requests 
      SET status = ?, 
          processed_at = datetime('now', '+9 hours'),
          processed_by = ?
      WHERE id = ?
    `;
    
    const result = await this.db.run(sql, [status, processedBy, id]);
    
    if ((result.changes || 0) === 0) {
      return null;
    }

    return await this.findById(id);
  }

  // リクエストを削除
  async delete(id: number): Promise<boolean> {
    const sql = 'DELETE FROM location_requests WHERE id = ?';
    const result = await this.db.run(sql, [id]);
    return (result.changes || 0) > 0;
  }

  // IP別のリクエスト制限チェック
  async checkRateLimit(ip: string): Promise<boolean> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 24時間以内のリクエスト数をチェック
    const sql = `
      SELECT COUNT(*) as count 
      FROM location_requests 
      WHERE requester_ip = ? 
        AND created_at > ?
    `;
    
    const result = await this.db.get<{count: number}>(sql, [
      ip, 
      twentyFourHoursAgo.toISOString().replace('T', ' ').substring(0, 19)
    ]);

    // 24時間以内に1回以上リクエストがあれば制限
    return (result?.count || 0) === 0;
  }

  // リクエスト制限テーブルを更新
  async updateRateLimit(ip: string): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO request_limits (ip_address, last_request_at, request_count)
      VALUES (?, datetime('now', '+9 hours'), 
        COALESCE((SELECT request_count FROM request_limits WHERE ip_address = ?), 0) + 1)
    `;
    
    await this.db.run(sql, [ip, ip]);
  }

  // 古いリクエスト制限レコードを削除（24時間以上経過）
  async cleanupOldRateLimits(): Promise<void> {
    const sql = `
      DELETE FROM request_limits 
      WHERE last_request_at < datetime('now', '+9 hours', '-24 hours')
    `;
    
    await this.db.run(sql);
  }

  // IPごとのリクエスト統計を取得
  async getRequestStatsByIp(): Promise<Array<{ip: string, count: number, lastRequest: Date}>> {
    const sql = `
      SELECT 
        requester_ip as ip,
        COUNT(*) as count,
        MAX(datetime(created_at, 'localtime')) as lastRequest
      FROM location_requests 
      GROUP BY requester_ip
      ORDER BY count DESC, lastRequest DESC
    `;
    
    const rows = await this.db.all<any>(sql);
    return rows.map(row => ({
      ip: row.ip,
      count: row.count,
      lastRequest: new Date(row.lastRequest)
    }));
  }

  // データベース行を LocationRequest オブジェクトにマッピング
  private mapRowToLocationRequest(row: any): LocationRequest {
    return {
      id: row.id,
      name: row.name,
      prefecture: row.prefecture,
      description: row.description,
      suggestedLatitude: row.suggestedLatitude || undefined,
      suggestedLongitude: row.suggestedLongitude || undefined,
      requesterIp: row.requesterIp,
      status: row.status,
      createdAt: new Date(row.createdAt),
      processedAt: row.processedAt ? new Date(row.processedAt) : undefined,
      processedBy: row.processedBy || undefined
    };
  }
}

export default LocationRequestModel;