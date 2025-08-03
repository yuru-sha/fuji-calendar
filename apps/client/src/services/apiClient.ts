import { CalendarResponse, LocationsResponse } from "@fuji-calendar/types";

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NODE_ENV === "production"
        ? "/api"
        : "http://localhost:3001/api";
  }

  async getMonthlyCalendar(
    year: number,
    month: number,
  ): Promise<CalendarResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/calendar/${year}/${month}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // 日付文字列を Date オブジェクトに変換
      const events = data.events.map((event: any) => ({
        ...event,
        date: new Date(event.date),
        events: event.events.map((e: any) => ({
          ...e,
          time: new Date(e.time),
        })),
      }));

      return {
        year: data.year,
        month: data.month,
        events,
      };
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
      // フォールバック: 空のデータを返す
      return {
        year,
        month,
        events: [],
      };
    }
  }

  async getLocations(): Promise<LocationsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/locations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      // フォールバック: 空のデータを返す
      return {
        locations: [],
      };
    }
  }

  async getDayEvents(date: string) {
    try {
      const response = await fetch(`${this.baseUrl}/events/${date}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // 時刻文字列を Date オブジェクトに変換
      const events = data.events.map((event: any) => ({
        ...event,
        time: new Date(event.time),
      }));

      return {
        ...data,
        events,
      };
    } catch (error) {
      console.error("Failed to fetch day events:", error);
      return { events: [] };
    }
  }


  async getUpcomingEvents(limit: number = 50) {
    try {
      const response = await fetch(
        `${this.baseUrl}/events/upcoming?limit=${limit}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // 時刻文字列を Date オブジェクトに変換
      const events = data.events.map((event: any) => ({
        ...event,
        time: new Date(event.time),
      }));

      return { events };
    } catch (error) {
      console.error("Failed to fetch upcoming events:", error);
      return { events: [] };
    }
  }

  async getBestShotDays(year: number, month: number) {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendar/${year}/${month}/best-shots`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // 時刻文字列を Date オブジェクトに変換
      const recommendations = data.recommendations.map((event: any) => ({
        ...event,
        time: new Date(event.time),
      }));

      return { recommendations };
    } catch (error) {
      console.error("Failed to fetch best shot days:", error);
      return { recommendations: [] };
    }
  }

  async exportLocations(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/admin/locations/export`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
  }

  async importLocations(locationsData: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/admin/locations/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(locationsData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  getErrorMessage(error: any): string {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.message) {
      return error.message;
    }
    return "An unexpected error occurred";
  }
}

export const apiClient = new ApiClient();
