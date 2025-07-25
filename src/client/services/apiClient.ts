import { 
  CalendarResponse, 
  EventsResponse, 
  FujiEvent, 
  Location,
  CalendarEvent,
  CalendarEventResponse,
  FujiEventResponse,
  WeatherInfo
} from '../../shared/types';

const API_BASE_URL = '/api'; // 開発・本番共に同一ポートなのでパス指定のみ

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorData;
    
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // JSON パースに失敗した場合はデフォルトメッセージを使用
    }
    
    throw new ApiError(errorMessage, response.status, errorData);
  }

  try {
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    throw new ApiError('Invalid JSON response', response.status);
  }
}

// 日付文字列をDateオブジェクトに変換するヘルパー関数
function convertStringToDate(dateStr: string): Date {
  return new Date(dateStr);
}

// FujiEventResponseをFujiEventに変換
function convertFujiEvent(event: FujiEventResponse): FujiEvent {
  return {
    ...event,
    time: convertStringToDate(event.time)
  };
}

// CalendarEventResponseをCalendarEventに変換
function convertCalendarEvent(event: CalendarEventResponse): CalendarEvent {
  return {
    ...event,
    date: convertStringToDate(event.date),
    events: event.events.map(convertFujiEvent)
  };
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // 月間カレンダーデータを取得
  async getMonthlyCalendar(year: number, month: number): Promise<CalendarResponse> {
    const response = await fetch(`${this.baseUrl}/calendar/${year}/${month}`);
    const data = await handleResponse<{
      year: number;
      month: number;
      events: CalendarEventResponse[];
    }>(response);
    
    return {
      year: data.year,
      month: data.month,
      events: data.events.map(convertCalendarEvent)
    };
  }

  // 特定日のイベント詳細を取得
  async getDayEvents(date: string): Promise<EventsResponse> {
    const response = await fetch(`${this.baseUrl}/events/${date}`);
    const data = await handleResponse<{
      date: string;
      events: FujiEventResponse[];
      weather?: unknown;
    }>(response);
    
    return {
      date: data.date,
      events: data.events.map(convertFujiEvent),
      weather: data.weather as WeatherInfo | undefined
    };
  }

  // 今後のイベントを取得
  async getUpcomingEvents(limit: number = 50): Promise<{ events: FujiEvent[], count: number, limit: number }> {
    const response = await fetch(`${this.baseUrl}/events/upcoming?limit=${limit}`);
    const data = await handleResponse<{
      events: FujiEventResponse[];
      count: number;
      limit: number;
    }>(response);
    
    return {
      events: data.events.map(convertFujiEvent),
      count: data.count,
      limit: data.limit
    };
  }

  // ベストショットの日を取得
  async getBestShotDays(year: number, month: number): Promise<{ year: number, month: number, recommendations: FujiEvent[] }> {
    const response = await fetch(`${this.baseUrl}/calendar/${year}/${month}/best`);
    return handleResponse(response);
  }

  // 撮影計画のサジェスト
  async getSuggestedPlan(startDate: string, endDate: string, preferredType?: 'diamond' | 'pearl'): Promise<{
    period: { startDate: string, endDate: string },
    preferredType: string,
    suggestions: FujiEvent[],
    count: number
  }> {
    const response = await fetch(`${this.baseUrl}/calendar/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        preferredType
      }),
    });
    return handleResponse(response);
  }

  // 特定地点の年間イベントを取得
  async getLocationYearlyEvents(locationId: number, year: number): Promise<{
    locationId: number,
    year: number,
    events: FujiEvent[],
    count: number
  }> {
    const response = await fetch(`${this.baseUrl}/calendar/location/${locationId}/${year}`);
    return handleResponse(response);
  }

  // カレンダー統計情報を取得
  async getCalendarStats(year: number): Promise<{
    year: number,
    totalEvents: number,
    diamondEvents: number,
    pearlEvents: number,
    monthlyBreakdown: Array<{
      month: number,
      totalEvents: number,
      diamondEvents: number,
      pearlEvents: number
    }>
  }> {
    const response = await fetch(`${this.baseUrl}/calendar/stats/${year}`);
    return handleResponse(response);
  }

  // 撮影地点一覧を取得
  async getLocations(): Promise<{ locations: Location[] }> {
    const response = await fetch(`${this.baseUrl}/locations`);
    return handleResponse(response);
  }

  // 特定の撮影地点を取得
  async getLocation(id: number): Promise<{ location: Location }> {
    const response = await fetch(`${this.baseUrl}/locations/${id}`);
    return handleResponse(response);
  }

  // 天気情報を取得
  async getWeather(date: string): Promise<WeatherInfo> {
    const response = await fetch(`${this.baseUrl}/weather/${date}`);
    return handleResponse(response);
  }

  // ヘルスチェック
  async healthCheck(): Promise<{ status: string, timestamp: string, version: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return handleResponse(response);
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();

// カスタムフック用のエラーハンドリング
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return '予期しないエラーが発生しました';
}

export { ApiError };