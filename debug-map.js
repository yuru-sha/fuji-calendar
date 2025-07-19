const { chromium } = require('playwright');

async function debugMapFunction() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // コンソールメッセージを監視
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  // エラーを監視
  page.on('pageerror', exception => {
    console.log('PAGE ERROR:', exception.message);
  });
  
  try {
    console.log('Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    
    console.log('Waiting for page to load...');
    await page.waitForTimeout(2000);
    
    // カレンダーが表示されるまで待機（CSSモジュールのクラス名）
    await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });
    console.log('Calendar found');
    
    // 日付をクリック（イベントがある日付を探す）
    const eventDateElement = await page.locator('[class*="day"][class*="hasEvents"]').first();
    if (await eventDateElement.count() > 0) {
      console.log('Clicking on a date with events...');
      await eventDateElement.click();
    } else {
      console.log('No event date found, clicking first day...');
      const dateElement = await page.locator('[class*="day"]').first();
      if (await dateElement.count() > 0) {
        await dateElement.click();
      } else {
        console.log('No clickable date elements found');
        return;
      }
    }
    
    // イベント詳細がカレンダー下に表示されるまで待機
    await page.waitForSelector('[class*="eventDetail"]', { timeout: 5000 });
    console.log('Event detail appeared below calendar');
      
    // 「地図を確認」ボタンを探す
    const mapButton = page.locator('text=地図を確認').first();
    if (await mapButton.count() > 0) {
      console.log('Map button found, clicking...');
      await mapButton.click();
      
      // 地図モーダルの表示を待機
      try {
        await page.waitForSelector('[class*="mapContainer"]', { timeout: 5000 });
        console.log('Map modal appeared successfully');
        
        // 地図の内容を確認
        const mapElement = await page.locator('[class*="map"]');
        const mapElementCount = await mapElement.count();
        console.log('Map elements found:', mapElementCount);
        
        // Leafletが読み込まれているかチェック
        const leafletLoaded = await page.evaluate(() => {
          return typeof window.L !== 'undefined';
        });
        console.log('Leaflet loaded:', leafletLoaded);
        
        // 少し待機してマーカーの追加を待つ
        await page.waitForTimeout(2000);
        
        // マーカーの状態を確認
        const markerInfo = await page.evaluate(() => {
          const markers = document.querySelectorAll('.leaflet-marker-pane img, .leaflet-marker-pane div[class*="Marker"]');
          const customMarkers = document.querySelectorAll('.leaflet-marker-pane div[class*="customDivIcon"]');
          return {
            totalMarkers: markers.length,
            customMarkers: customMarkers.length,
            markerDetails: Array.from(markers).map(m => ({
              tag: m.tagName,
              className: m.className,
              src: m.src || 'N/A',
              innerHTML: m.innerHTML?.substring(0, 50) || 'N/A'
            }))
          };
        });
        console.log('Marker info:', markerInfo);
        
        // Leafletマップインスタンスの詳細確認
        const mapDetails = await page.evaluate(() => {
          const mapContainers = document.querySelectorAll('.leaflet-container');
          if (mapContainers.length === 0) return { error: 'No leaflet containers found' };
          
          const container = mapContainers[0];
          return {
            hasMapInstance: container._leaflet_id !== undefined,
            layers: container.querySelectorAll('.leaflet-layer').length,
            panes: {
              markerPane: !!container.querySelector('.leaflet-marker-pane'),
              tilePane: !!container.querySelector('.leaflet-tile-pane'),
              overlayPane: !!container.querySelector('.leaflet-overlay-pane')
            }
          };
        });
        console.log('Map details:', mapDetails);
        
      } catch (error) {
        console.log('Map modal did not appear:', error.message);
        
        // マップコンテナの状態を詳しく確認
        const mapContainerDetails = await page.evaluate(() => {
          const mapContainers = document.querySelectorAll('[class*="mapContainer"]');
          return Array.from(mapContainers).map(el => {
            const style = window.getComputedStyle(el);
            return {
              visible: style.display !== 'none' && style.visibility !== 'hidden',
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity,
              zIndex: style.zIndex,
              offsetHeight: el.offsetHeight,
              offsetWidth: el.offsetWidth,
              className: el.className
            };
          });
        });
        console.log('Map container details:', mapContainerDetails);
        
        // モーダルの状態を確認
        const allModals = await page.locator('[class*="modal"]').count();
        console.log('Total modals found:', allModals);
        
        // 現在表示されている要素を確認
        const visibleElements = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          const visible = [];
          for (let el of elements) {
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0) {
              if (el.className && el.className.includes('modal')) {
                visible.push({
                  tag: el.tagName,
                  class: el.className,
                  text: el.textContent?.substring(0, 50),
                  zIndex: style.zIndex
                });
              }
            }
          }
          return visible;
        });
        console.log('Visible modal elements:', visibleElements);
      }
    } else {
      console.log('Map button not found');
    }
    
    await page.waitForTimeout(5000); // 5秒待機して確認
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

debugMapFunction();