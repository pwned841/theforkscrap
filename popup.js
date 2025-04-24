document.addEventListener('DOMContentLoaded', function() {
  const restaurantList = document.getElementById('restaurant-list');
  const exportBtn = document.getElementById('export-btn');
  const statusDiv = document.getElementById('status');
  
  let scrapedRestaurants = [];
  
  // Utility function to extract ID and number from URL
  function extractIdAndNumber(url) {
    const match = url.match(/\/restaurant\/([^#?\/]*)/);
    let id = match ? match[1] : '';
    let number = '';
    if (id) {
      // Get the number after the last '-r'
      const numMatch = id.match(/-r(\d+)$/);
      number = numMatch ? numMatch[1] : '';
    }
    return { id, number };
  }

  // Display restaurants
  function displayRestaurants(restaurants) {
    if (!restaurants || restaurants.length === 0) {
      restaurantList.innerHTML = '<p>No restaurants found. Make sure you are on TheFork page.</p>';
      return;
    }

    // Add id and number to each restaurant
    scrapedRestaurants = restaurants.map(r => {
      const fullUrl = r.fullUrl || `https://www.thefork.fr${r.href}`;
      const { id, number } = extractIdAndNumber(fullUrl);
      return { ...r, id, number, fullUrl };
    });
    restaurantList.innerHTML = '';

    scrapedRestaurants.forEach((restaurant, index) => {
      const item = document.createElement('div');
      item.className = 'restaurant-item';

      const name = document.createElement('div');
      name.className = 'restaurant-name';
      name.textContent = `${index + 1}. ${restaurant.name}`;

      const idDiv = document.createElement('div');
      idDiv.className = 'restaurant-id';
      idDiv.textContent = `ID: ${restaurant.id} | Number: ${restaurant.number}`;

      const link = document.createElement('a');
      link.className = 'restaurant-link';
      link.href = restaurant.fullUrl;
      link.textContent = restaurant.fullUrl;
      link.target = '_blank';

      item.appendChild(name);
      item.appendChild(idDiv);
      item.appendChild(link);
      restaurantList.appendChild(item);
    });

    statusDiv.textContent = `Total: ${scrapedRestaurants.length} restaurants found`;
  }

  // Export to CSV
  function exportToCSV(restaurants) {
    if (!restaurants || restaurants.length === 0) {
      statusDiv.innerHTML = '<span class="error">No restaurants to export</span>';
      return;
    }

    let csvContent = "Name,ID,Number,URL\n";

    restaurants.forEach(restaurant => {
      // Escape commas and quotes in restaurant names
      const escapedName = restaurant.name.replace(/"/g, '""');
      const escapedId = (restaurant.id || '').replace(/"/g, '""');
      const escapedNumber = (restaurant.number || '').replace(/"/g, '""');
      const fullUrl = restaurant.fullUrl;
      csvContent += `"${escapedName}","${escapedId}","${escapedNumber}","${fullUrl}"\n`;
    });

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'restaurants_thefork.csv');
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      statusDiv.innerHTML = '<span class="success">Export successful!</span>';
    } catch (e) {
      statusDiv.innerHTML = '<span class="error">Export failed!</span>';
    }
  }

  // Export button event handler
  exportBtn.addEventListener('click', function() {
    exportToCSV(scrapedRestaurants);
  });
  
  // Get restaurant links
  chrome.runtime.sendMessage({ action: "getRestaurantLinks" }, function(response) {
    if (chrome.runtime.lastError) {
      console.error("Error sending message to background:", chrome.runtime.lastError);
      restaurantList.innerHTML = '<p class="error">Extension communication error</p>';
      return;
    }
    
    if (response && response.error) {
      console.error("Error from background:", response.error);
      restaurantList.innerHTML = `<p class="error">Error: ${response.error}</p>`;
      return;
    }
    
    if (response && response.restaurantLinks) {
      displayRestaurants(response.restaurantLinks);
    } else {
      restaurantList.innerHTML = '<p class="error">No data received</p>';
    }
  });
});
