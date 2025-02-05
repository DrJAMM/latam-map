import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, MarkerF, PolylineF } from '@react-google-maps/api';
import Papa from 'papaparse';

const LatamMap = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [availableTags, setAvailableTags] = useState(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);

  const mapContainerStyle = {
    width: '100%',
    height: '100%'
  };

  const defaultCenter = {
    lat: -15,
    lng: -75  // Centered on Latin America
  };

  const countryBounds = {
    'Mexico': {
      center: { lat: 23.6345, lng: -102.5528 },
      bounds: {
        north: 32.7187629,
        south: 14.5345485,
        east: -86.7415,
        west: -118.6523001
      }
    },
    'Colombia': {
      center: { lat: 4.5709, lng: -74.2973 },
      bounds: {
        north: 13.3805948,
        south: -4.2316872,
        east: -66.8511907,
        west: -81.7281
      }
    },
    'Chile': {
      center: { lat: -33.6751, lng: -70.5430 },
      bounds: {
        north: -32.5,
        south: -35.9,
        east: -70.4,
        west: -71.6
      }
    },
    'Argentina': {
      center: { lat: -38.4161, lng: -63.6167 },
      bounds: {
        north: -21.7808,
        south: -55.0577,
        east: -53.6374,
        west: -73.5605
      }
    },
    'Peru': {
      center: { lat: -9.1900, lng: -75.0152 },
      bounds: {
        north: -0.0392,
        south: -18.3479,
        east: -68.6778,
        west: -81.3267
      }
    },
    'Ecuador': {
      center: { lat: -1.8312, lng: -78.1834 },
      bounds: {
        north: 1.4380,
        south: -5.0159,
        east: -75.1843,
        west: -81.0834
      }
    },
    'Venezuela': {
      center: { lat: 6.4238, lng: -66.5897 },
      bounds: {
        north: 12.2019,
        south: 0.6475,
        east: -59.8038,
        west: -73.3757
      }
    }
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    if (map && member) {
      const bounds = new window.google.maps.LatLngBounds();

      // Always include the origin coordinates
      bounds.extend({
        lat: member.origin.coordinates[0],
        lng: member.origin.coordinates[1]
      });

      // If the member has a current location, include it in the bounds
      if (member.current?.coordinates) {
        bounds.extend({
          lat: member.current.coordinates[0],
          lng: member.current.coordinates[1]
        });
      }

      // Fit the map to the calculated bounds
      map.fitBounds(bounds, { padding: { top: 50, right: 50, bottom: 50, left: 50 } });

      // Optional: Add a small delay to ensure smooth panning
      setTimeout(() => {
        if (member.current?.coordinates) {
          // If there's a current location, pan to the midpoint between origin and current
          const midLat = (member.origin.coordinates[0] + member.current.coordinates[0]) / 2;
          const midLng = (member.origin.coordinates[1] + member.current.coordinates[1]) / 2;
          map.panTo({ lat: midLat, lng: midLng });
        } else {
          // If no current location, pan to the origin
          map.panTo({
            lat: member.origin.coordinates[0],
            lng: member.origin.coordinates[1]
          });
        }
      }, 100);
    }
  };


  const handleCountryChange = useCallback((country) => {
    setSelectedCountry(country);
    if (map && country) {
      if (countryBounds[country]) {
        const bounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(
            countryBounds[country].bounds.south,
            countryBounds[country].bounds.west
          ),
          new window.google.maps.LatLng(
            countryBounds[country].bounds.north,
            countryBounds[country].bounds.east
          )
        );
        map.fitBounds(bounds);
        setTimeout(() => {
          map.panTo(countryBounds[country].center);
        }, 100);
      }
    } else {
      map.panTo(defaultCenter);
      map.setZoom(3);
    }
  }, [map, countryBounds, defaultCenter]);
  const handleClear = () => {
    setSelectedMember(null); // Clear selected member
    setSelectedCountry(''); // Clear selected country
    if (map) {
      map.panTo(defaultCenter); // Reset map to default center
      map.setZoom(3); // Reset zoom level
    }
  };

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTU3J9hVXZ0VwcJAlvxa1FZ3FGZUDD3Y8xNlcXXQ6Wzt6VjLoh6d4EY3QxywLKEQ9ZyWbwyTVaFOryk/pub?output=csv';
        const response = await fetch(spreadsheetUrl);
        const csvData = await response.text();
        
        Papa.parse(csvData, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const transformedData = results.data
              .filter(row => row.originLatitude && row.originLongitude)
              .map(row => ({
                id: row.id,
                name: row.name,
                institute: row.institute,
                email: row.email,
                bio: row.bio,
                origin: {
                  country: row.originCountry,
                  coordinates: [parseFloat(row.originLatitude), parseFloat(row.originLongitude)]
                },
                current: {
                  country: row.currentLocation,
                  coordinates: row.currentLatitude && row.currentLongitude ? 
                    [parseFloat(row.currentLatitude), parseFloat(row.currentLongitude)] : null
                },
                researchTags: row.researchTags ? row.researchTags.split(',').map(tag => tag.trim()) : []
              }));
            
            const allTags = [...new Set(transformedData.flatMap(member => member.researchTags))];
            setAvailableTags(['all', ...allTags.sort()]);
            setMembers(transformedData);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error:', error);
        setError('Error fetching spreadsheet data');
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const countries = [...new Set(members.map(m => m.origin.country))].sort();
  
  const filteredMembers = members.filter(member => 
    (activeFilter === 'all' || member.researchTags.includes(activeFilter)) &&
    (selectedCountry === '' || member.origin.country === selectedCountry)
  );

  const getMarkerColor = (country, memberId) => {
    const countryMembers = members.filter(m => m.origin.country === country);
    const memberIndex = countryMembers.findIndex(m => m.id === memberId);
    const baseHue = 0; // Red
    const saturation = 100;
    const lightness = Math.max(40, 70 - (memberIndex * 15));
    return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
  };

  if (loading) return <div className="flex items-center justify-center h-96">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
      <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {availableTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveFilter(tag)}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeFilter === tag ? '#3b82f6' : '#e5e7eb',
                color: activeFilter === tag ? 'white' : 'black',
                cursor: 'pointer'
              }}
            >
              {tag === 'all' ? 'All' : tag}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        <div style={{ width: '70%', height: '100%' }}>
        <LoadScript 
  googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={3}
              onLoad={setMap}
              options={{
                minZoom: 2,
                maxZoom: 8
              }}
            >
              {filteredMembers.map(member => (
                <React.Fragment key={member.id}>
                  <MarkerF
                    position={{
                      lat: member.origin.coordinates[0],
                      lng: member.origin.coordinates[1]
                    }}
                    onClick={() => handleMemberSelect(member)}
                    icon={{
                      path: 'M 0,0 m -6,0 a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0',
                      fillColor: getMarkerColor(member.origin.country, member.id),
                      fillOpacity: 1,
                      scale: 1,
                      strokeColor: '#000000',
                      strokeWeight: 1
                    }}
                  />
                  
                  {selectedMember && 
                   selectedMember.id === member.id && 
                   member.current?.country && 
                   member.current.country !== member.origin.country && 
                   member.current.coordinates && (
                    <>
                      <MarkerF
                        position={{
                          lat: member.current.coordinates[0],
                          lng: member.current.coordinates[1]
                        }}
                        icon={{
                          path: 'M 0,0 m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0',
                          fillColor: '#4B5563',
                          fillOpacity: 1,
                          scale: 1,
                          strokeColor: '#000000',
                          strokeWeight: 1
                        }}
                      />
                      <PolylineF
                        path={[
                          { 
                            lat: member.origin.coordinates[0], 
                            lng: member.origin.coordinates[1] 
                          },
                          { 
                            lat: member.current.coordinates[0], 
                            lng: member.current.coordinates[1] 
                          }
                        ]}
                        options={{
                          strokeColor: '#4B5563',
                          strokeOpacity: 0.8,
                          strokeWeight: 1,
                          geodesic: true
                        }}
                      />
                    </>
                  )}
                </React.Fragment>
              ))}
            </GoogleMap>
          </LoadScript>
        </div>

        <div style={{ width: '30%', padding: '20px', backgroundColor: '#f9fafb', overflowY: 'auto' }}>
          <select
            style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
            value={selectedCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
          >
            <option value="">País (Country)</option>
            {countries.map(country => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          <select
            style={{ width: '100%', padding: '8px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
            value={selectedMember?.id || ''}
            onChange={(e) => {
              const member = members.find(m => m.id === parseInt(e.target.value));
              handleMemberSelect(member);
            }}
          >
            <option value="">Miembro (Member)</option>
            {filteredMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>

          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            {selectedMember ? (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  {selectedMember.name}
                </h3>
                <p style={{ color: '#4b5563', marginBottom: '8px' }}>
                  {selectedMember.institute}
                  {selectedMember.current?.country && selectedMember.current.country !== selectedMember.origin.country && (
                    <span> ({selectedMember.current.country})</span>
                  )}
                </p>
                <p style={{ color: '#4b5563', marginBottom: '16px' }}>
                  País: {selectedMember.origin.country}
                </p>
                <p style={{ color: '#4b5563', marginBottom: '16px', whiteSpace: 'pre-line' }}>
                  {selectedMember.bio}
                </p>
                {selectedMember.email && (
                  <div className="text-center">
                    <a 
                      href={`mailto:${selectedMember.email}`} 
                      style={{ color: '#2563eb', textDecoration: 'none' }}
                      onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                    >
                      ✉️ {selectedMember.email}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6b7280' }}>
                Detalles (Details)
              </div>
            )}
          </div>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            style={{
              width: '100%',
              padding: '8px 16px',
              marginTop: '20px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default LatamMap;