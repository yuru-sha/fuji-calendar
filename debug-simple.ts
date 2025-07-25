import * as Astronomy from 'astronomy-engine';

function testBasicAstronomy() {
  try {
    console.log('Testing basic Astronomy Engine...');
    
    const latitude = 35.313326;
    const longitude = 139.785738;
    const elevation = 1;
    
    console.log('Input values:', { latitude, longitude, elevation });
    console.log('Types:', { 
      latitude: typeof latitude, 
      longitude: typeof longitude, 
      elevation: typeof elevation 
    });
    
    // 値の検証
    console.log('Validation:', {
      latitudeFinite: Number.isFinite(latitude),
      longitudeFinite: Number.isFinite(longitude),
      elevationFinite: Number.isFinite(elevation),
      latitudeNull: latitude == null,
      longitudeNull: longitude == null,
      elevationNull: elevation == null,
      latitudeNaN: isNaN(latitude),
      longitudeNaN: isNaN(longitude),
      elevationNaN: isNaN(elevation)
    });
    
    const observer = new Astronomy.Observer(latitude, longitude, elevation);
    console.log('Observer created successfully');
    
    const date = new Date();
    
    // 正しい方法：Astronomy.Equatorを使用
    const sunEquatorial = Astronomy.Equator('Sun', date, observer, false, false);
    console.log('Sun equatorial (correct):', sunEquatorial);
    console.log('Properties:', {
      ra: sunEquatorial.ra,
      dec: sunEquatorial.dec,
      dist: sunEquatorial.dist,
      raType: typeof sunEquatorial.ra,
      decType: typeof sunEquatorial.dec,
      distType: typeof sunEquatorial.dist
    });
    
    const sunHorizontal = Astronomy.Horizon(date, observer, sunEquatorial.ra, sunEquatorial.dec, 'normal');
    console.log('Sun horizontal:', sunHorizontal);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBasicAstronomy();