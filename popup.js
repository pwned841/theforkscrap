document.addEventListener('DOMContentLoaded', function() {
  const restaurantList = document.getElementById('restaurant-list');
  const exportBtn = document.getElementById('export-btn');
  const fetchAllBtn = document.getElementById('fetch-all-btn');
  const progressBarContainer = document.getElementById('progress-bar-container');
  const progressBar = document.getElementById('progress-bar');
  const statusDiv = document.getElementById('status');
  
  // Storage for restaurants with their details
  let scrapedRestaurants = [];
  
  // Function to display restaurants
  function displayRestaurants(restaurants) {
    if (!restaurants || restaurants.length === 0) {
      restaurantList.innerHTML = '<p>No restaurants found. Make sure you are on TheFork website.</p>';
      return;
    }
    
    scrapedRestaurants = restaurants;
    restaurantList.innerHTML = '';
    
    restaurants.forEach((restaurant, index) => {
      const item = document.createElement('div');
      item.className = 'restaurant-item';
      item.dataset.id = restaurant.id;
      item.dataset.index = index;
      
      // Status element
      const statusIndicator = document.createElement('span');
      statusIndicator.className = 'status-indicator status-pending';
      
      // Restaurant name with status indicator
      const name = document.createElement('div');
      name.className = 'restaurant-name';
      name.appendChild(statusIndicator);
      name.appendChild(document.createTextNode(`${index + 1}. ${restaurant.name}`));
      
      // Restaurant link
      const link = document.createElement('a');
      link.className = 'restaurant-link';
      link.href = restaurant.fullUrl;
      link.textContent = restaurant.fullUrl || `https://www.thefork.fr${restaurant.href}`;
      link.target = '_blank';
      
      // Container for details
      const detailsContainer = document.createElement('div');
      detailsContainer.className = 'restaurant-details';
      detailsContainer.innerHTML = '<p>Click "Fetch" to see restaurant details.</p>';
      
      // Button to fetch details
      const fetchBtn = document.createElement('button');
      fetchBtn.className = 'fetch-details-btn';
      fetchBtn.textContent = 'Fetch';
      fetchBtn.onclick = (e) => {
        e.stopPropagation();
        fetchRestaurantDetails(restaurant, detailsContainer, statusIndicator);
      };
      
      item.appendChild(name);
      item.appendChild(link);
      item.appendChild(detailsContainer);
      item.appendChild(fetchBtn);
      
      // Open/close details by clicking on the item
      item.onclick = () => {
        const wasActive = detailsContainer.classList.contains('active');
        
        // Close all other active details
        document.querySelectorAll('.restaurant-details.active').forEach(el => {
          if (el !== detailsContainer) {
            el.classList.remove('active');
          }
        });
        
        // Toggle active state for this detail
        if (wasActive) {
          detailsContainer.classList.remove('active');
        } else {
          detailsContainer.classList.add('active');
        }
      };
      
      restaurantList.appendChild(item);
    });
    
    statusDiv.textContent = `Total: ${restaurants.length} restaurants found`;
  }
  
  // Function to fetch restaurant details
  function fetchRestaurantDetails(restaurant, detailsContainer, statusIndicator) {
    if (!restaurant.id) {
      detailsContainer.innerHTML = '<p class="error">Restaurant ID not found in URL</p>';
      statusIndicator.className = 'status-indicator status-error';
      return;
    }
    
    // Extract restaurant slug from URL
    let restaurantSlug = '';
    if (restaurant.href) {
      // Remove potential URL parameters (#xxx)
      restaurantSlug = restaurant.href.split('#')[0];
      // Remove "/restaurant/" prefix if it exists
      if (restaurantSlug.startsWith('/restaurant/')) {
        restaurantSlug = restaurantSlug.substring('/restaurant/'.length);
      }
    }
    
    // Display spinner during loading
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    statusIndicator.className = 'status-indicator status-pending';
    detailsContainer.innerHTML = '';
    detailsContainer.appendChild(spinner);
    detailsContainer.appendChild(document.createTextNode(' Loading information...'));
    detailsContainer.classList.add('active');
    
    // Send request to background script
    chrome.runtime.sendMessage({
      action: "fetchRestaurantDetails",
      restaurantId: restaurant.id,
      restaurantSlug: restaurantSlug
    }, function(response) {
      // Remove spinner
      spinner.remove();
      
      if (chrome.runtime.lastError) {
        console.error("Error fetching restaurant details:", chrome.runtime.lastError);
        detailsContainer.innerHTML = `<p class="error">Communication error: ${chrome.runtime.lastError.message}</p>`;
        statusIndicator.className = 'status-indicator status-error';
        return;
      }
      
      if (!response || response.error) {
        const errorMsg = response ? response.error : "Unknown error";
        console.error("Error response:", errorMsg);
        detailsContainer.innerHTML = `<p class="error">Error: ${errorMsg}</p>`;
        statusIndicator.className = 'status-indicator status-error';
        return;
      }
      
      if (response.success && response.data) {
        // Store details in restaurant object
        restaurant.details = response.data;
        statusIndicator.className = 'status-indicator status-success';
        
        // Display details
        const data = response.data;
        let detailsHTML = '<div>';
        
        // General information
        detailsHTML += `<p><span class="detail-label">Name:</span> ${data.name || 'Not available'}</p>`;
        detailsHTML += `<p><span class="detail-label">Phone:</span> ${data.phone || 'Not available'}</p>`;
        
        // Address
        if (data.address) {
          detailsHTML += `<p><span class="detail-label">Street:</span> ${data.address.street || 'Not available'}</p>`;
          detailsHTML += `<p><span class="detail-label">Zip Code:</span> ${data.address.zipCode || 'Not available'}</p>`;
          detailsHTML += `<p><span class="detail-label">City:</span> ${data.address.locality || 'Not available'}</p>`;
        }
        
        // Legal information
        if (data.legal) {
          detailsHTML += '<h3>Legal Information</h3>';
          detailsHTML += `<p><span class="detail-label">Legal Name:</span> ${data.legal.registerName || 'Not available'}</p>`;
          detailsHTML += `<p><span class="detail-label">Reg. Number:</span> ${data.legal.registerNumber || 'Not available'}</p>`;
          detailsHTML += `<p><span class="detail-label">Email:</span> ${data.legal.email || 'Not available'}</p>`;
          detailsHTML += `<p><span class="detail-label">Website:</span> ${data.legal.website || 'Not available'}</p>`;
        }
        
        detailsHTML += '</div>';
        detailsContainer.innerHTML = detailsHTML;
      } else {
        detailsContainer.innerHTML = '<p class="error">Unexpected response format</p>';
        statusIndicator.className = 'status-indicator status-error';
      }
    });
  }
  
  // Function to fetch details for all restaurants
  async function fetchAllRestaurantDetails() {
    if (scrapedRestaurants.length === 0) {
      statusDiv.innerHTML = '<span class="error">No restaurants to analyze</span>';
      return;
    }
    
    // Display progress bar
    progressBarContainer.style.display = 'block';
    progressBar.style.width = '0%';
    
    // Disable buttons during processing
    fetchAllBtn.disabled = true;
    exportBtn.disabled = true;
    
    const restaurantsWithoutDetails = scrapedRestaurants.filter(r => !r.details && r.id);
    
    if (restaurantsWithoutDetails.length === 0) {
      statusDiv.innerHTML = '<span class="success">All restaurants have already been analyzed</span>';
      progressBarContainer.style.display = 'none';
      fetchAllBtn.disabled = false;
      exportBtn.disabled = false;
      return;
    }
    
    statusDiv.textContent = `Fetching details (0/${restaurantsWithoutDetails.length})...`;
    
    // Process restaurants in batches to avoid overloading the API
    const batchSize = 5;
    const delay = 500; // Delay between requests in ms
    
    for (let i = 0; i < restaurantsWithoutDetails.length; i += batchSize) {
      const batch = restaurantsWithoutDetails.slice(i, i + batchSize);
      
      // Process restaurants in this batch in parallel
      await Promise.all(batch.map(async (restaurant) => {
        try {
          const detailsContainer = document.querySelector(`.restaurant-item[data-id="${restaurant.id}"] .restaurant-details`);
          const statusIndicator = document.querySelector(`.restaurant-item[data-id="${restaurant.id}"] .status-indicator`);
          
          if (detailsContainer && statusIndicator) {
            await new Promise(resolve => {
              fetchRestaurantDetails(restaurant, detailsContainer, statusIndicator);
              setTimeout(resolve, delay);
            });
          }
        } catch (error) {
          console.error(`Error fetching details for restaurant ${restaurant.id}:`, error);
        }
      }));
      
      // Update progress bar
      const progress = Math.min(100, Math.round(((i + batch.length) / restaurantsWithoutDetails.length) * 100));
      progressBar.style.width = `${progress}%`;
      statusDiv.textContent = `Fetching details (${Math.min(i + batch.length, restaurantsWithoutDetails.length)}/${restaurantsWithoutDetails.length})...`;
    }
    
    // Restore button state
    fetchAllBtn.disabled = false;
    exportBtn.disabled = false;
    progressBar.style.width = '100%';
    statusDiv.innerHTML = '<span class="success">Details retrieval completed!</span>';
    
    // Hide progress bar after a short delay
    setTimeout(() => {
      progressBarContainer.style.display = 'none';
    }, 1500);
  }
  
  // Function to export as CSV
  function exportToCSV() {
    if (!scrapedRestaurants || scrapedRestaurants.length === 0) {
      statusDiv.innerHTML = '<span class="error">No restaurants to export</span>';
      return;
    }
    
    // Define CSV headers
    let csvContent = "Name,URL,ID,Phone,Street,ZIP Code,City,Legal Name,Registration Number,Email,Website\n";
    
    scrapedRestaurants.forEach(restaurant => {
      const fullUrl = restaurant.fullUrl || `https://www.thefork.fr${restaurant.href}`;
      
      // Get details if they exist
      const details = restaurant.details || {};
      const address = details.address || {};
      const legal = details.legal || {};
      
      // Escape commas and quotes in text fields
      const escapeCsv = (text) => {
        if (text === null || text === undefined) return '';
        return `"${String(text).replace(/"/g, '""')}"`;
      };
      
      // Build CSV row
      const row = [
        escapeCsv(restaurant.name),
        escapeCsv(fullUrl),
        escapeCsv(restaurant.id),
        escapeCsv(details.phone),
        escapeCsv(address.street),
        escapeCsv(address.zipCode),
        escapeCsv(address.locality),
        escapeCsv(legal.registerName),
        escapeCsv(legal.registerNumber),
        escapeCsv(legal.email),
        escapeCsv(legal.website)
      ];
      
      csvContent += row.join(',') + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'thefork_restaurant_details.csv');
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    statusDiv.innerHTML = '<span class="success">Export successful!</span>';
  }
  
  // Event listener for export button
  exportBtn.addEventListener('click', exportToCSV);
  
  // Event listener for fetch all details button
  fetchAllBtn.addEventListener('click', fetchAllRestaurantDetails);
  
  // Fetch restaurant links
  chrome.runtime.sendMessage({ action: "getRestaurantLinks" }, function(response) {
    if (chrome.runtime.lastError) {
      console.error("Error sending message to background:", chrome.runtime.lastError);
      restaurantList.innerHTML = '<p class="error">Error communicating with extension</p>';
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
