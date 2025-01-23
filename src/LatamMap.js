import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
 iconRetinaUrl: markerIcon2x,
 iconUrl: markerIcon,
 shadowUrl: markerShadow,
});

const LatamMap = () => {
 const [members, setMembers] = useState([]);
 const [selectedMember, setSelectedMember] = useState(null);
 const [activeFilter, setActiveFilter] = useState('all');
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [availableTags, setAvailableTags] = useState(['all']);

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
           const transformedData = results.data.map(row => ({
             id: row.id,
             name: row.name,
             institute: row.institute,
             email: row.email,
             origin: {
               country: row.originCountry,
               coordinates: [
                 parseFloat(row.originLatitude),
                 parseFloat(row.originLongitude)
               ]
             },
             current: {
               country: row.currentLocation,
               coordinates: [
                 parseFloat(row.currentLatitude),
                 parseFloat(row.currentLongitude)
               ]
             },
             researchTags: row.researchTags.split(',').map(tag => tag.trim()),
             bio: row.bio,
             image: row.image
           }));
           
           setMembers(transformedData);
           const allTags = [...new Set(transformedData.flatMap(member => member.researchTags))];
           setAvailableTags(['all', ...allTags]);
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

 // Custom marker icons
 const originIcon = new L.Icon({
   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
   iconSize: [25, 41],
   iconAnchor: [12, 41],
   popupAnchor: [1, -34],
   shadowSize: [41, 41]
 });

 const currentIcon = new L.Icon({
   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
   iconSize: [25, 41],
   iconAnchor: [12, 41],
   popupAnchor: [1, -34],
   shadowSize: [41, 41]
 });

 if (loading) return <div className="flex items-center justify-center h-96">Loading...</div>;
 if (error) return <div className="text-red-500">{error}</div>;

 return (
   <div className="p-4">
     {/* Filter Buttons */}
     <div className="mb-4 flex flex-wrap gap-2">
       {availableTags.map(tag => (
         <button
           key={tag}
           onClick={() => setActiveFilter(tag)}
           className={`px-4 py-2 rounded-full transition-colors duration-200 ${
             activeFilter === tag 
               ? 'bg-blue-600 text-white' 
               : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
           }`}
         >
           {tag}
         </button>
       ))}
     </div>

     <div className="flex gap-4">
       {/* Map Container */}
       <div className="relative w-[80%] h-[600px] border rounded-lg overflow-hidden">
         <MapContainer
           center={[0, 0]}
           zoom={2}
           style={{ height: '600px', width: '100%' }}
           scrollWheelZoom={true}
           className="z-0"
         >
           <TileLayer
             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
           />
           
           {members
             .filter(member => 
               activeFilter === 'all' || member.researchTags.includes(activeFilter)
             )
             .map(member => (
               <React.Fragment key={member.id}>
                 {/* Origin location - always shown */}
                 <Marker
                   position={member.origin.coordinates}
                   icon={originIcon}
                   eventHandlers={{
                     click: () => setSelectedMember(member)
                   }}
                 />
                 
                 {/* Current location and line - only shown when member is selected */}
                 {selectedMember && selectedMember.id === member.id && 
                  member.origin.country !== member.current.country && (
                   <>
                     <Marker
                       position={member.current.coordinates}
                       icon={currentIcon}
                     />
                     <Polyline
                       positions={[member.origin.coordinates, member.current.coordinates]}
                       dashArray="5,10"
                       color="#666"
                     />
                   </>
                 )}
               </React.Fragment>
             ))}
         </MapContainer>
       </div>

       {/* Member Details Panel */}
       {selectedMember ? (
         <div className="flex-none w-80 bg-white p-4 rounded-lg shadow-lg border">
           <button 
             onClick={() => setSelectedMember(null)}
             className="float-right text-gray-500 hover:text-gray-700 text-xl"
           >
             ×
           </button>
           <div className="flex flex-col items-center text-center">
             <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 mb-4">
               {selectedMember.image ? (
                 <img
                   src={`./images/${selectedMember.image}`}
                   alt={selectedMember.name}
                   className="w-full h-full object-cover"
                   onError={(e) => {
                     e.target.style.display = 'none';
                     e.target.parentElement.innerHTML = `
                       <div class="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 text-2xl font-bold">
                         ${selectedMember.name.split(' ').map(n => n[0]).join('')}
                       </div>
                     `;
                   }}
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 text-2xl font-bold">
                   {selectedMember.name.split(' ').map(n => n[0]).join('')}
                 </div>
               )}
             </div>
             <h3 className="font-bold text-xl mb-1">{selectedMember.name}</h3>
             <p className="text-gray-600 mb-2">{selectedMember.institute}</p>
             <p className="text-sm text-gray-600 mb-4">
               Origin: {selectedMember.origin.country}
               {selectedMember.origin.country !== selectedMember.current.country && (
                 <><br />Current: {selectedMember.current.country}</>
               )}
             </p>
             <p className="text-gray-700 mb-4">{selectedMember.bio}</p>
             <p className="mb-4 text-gray-700">
               Research areas: {selectedMember.researchTags.join(', ')}
             </p>
             {selectedMember.email && (
               <div className="text-center">
                 <a 
                   href={`mailto:${selectedMember.email}`}
                   className="text-blue-600 hover:underline"
                 >
                   {selectedMember.email}
                 </a>
               </div>
             )}
           </div>
         </div>
       ) : (
         <div className="flex-none w-80 bg-white p-4 rounded-lg shadow-lg border flex items-center justify-center text-gray-500">
           Select a member to view details
         </div>
       )}
     </div>
   </div>
 );
};

export default LatamMap;