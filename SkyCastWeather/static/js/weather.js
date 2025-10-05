// Weather App JavaScript
class WeatherApp {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Form elements
        this.searchForm = document.getElementById('search-form');
        this.cityInput = document.getElementById('city-input');
        this.searchBtn = document.getElementById('search-btn');

        // Display elements
        this.loading = document.getElementById('loading');
        this.errorAlert = document.getElementById('error-alert');
        this.errorMessage = document.getElementById('error-message');
        this.currentWeather = document.getElementById('current-weather');
        this.forecastSection = document.getElementById('forecast-section');
        this.forecastContainer = document.getElementById('forecast-container');

        // Current weather elements
        this.currentCity = document.getElementById('current-city');
        this.currentDescription = document.getElementById('current-description');
        this.currentTemp = document.getElementById('current-temp');
        this.currentHumidity = document.getElementById('current-humidity');
        this.currentWind = document.getElementById('current-wind');
        
        // Recent searches elements
        this.recentSearches = document.getElementById('recent-searches');
        this.recentSearchesContainer = document.getElementById('recent-searches-container');
        
        // AI Summary elements
        this.aiSummarySection = document.getElementById('ai-summary-section');
        this.aiSummaryLoading = document.getElementById('ai-summary-loading');
        this.aiSummaryContent = document.getElementById('ai-summary-content');
        this.aiSummaryText = document.getElementById('ai-summary-text');
        this.aiSummaryError = document.getElementById('ai-summary-error');
        this.aiSummaryErrorText = document.getElementById('ai-summary-error-text');
        this.clearRecentBtn = document.getElementById('clear-recent');
        
        // Weather background elements
        this.weatherBackground = document.getElementById('weather-background');
        this.citySkyline = document.getElementById('city-skyline');
        this.weatherParticles = document.getElementById('weather-particles');
        this.sunRays = document.getElementById('sun-rays');
        this.cloudsContainer = document.getElementById('clouds-container');
        
        // Initialize animated background
        this.initializeSkyline();
        this.initializeWeatherEffects();
    }

    attachEventListeners() {
        this.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchWeather();
        });

        // Also trigger search on Enter key in input field
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchWeather();
            }
        });

        // Handle city suggestion buttons
        document.querySelectorAll('.city-suggestion').forEach(button => {
            button.addEventListener('click', (e) => {
                const cityName = e.target.getAttribute('data-city');
                this.cityInput.value = cityName;
                this.searchWeather();
            });
        });

        // Handle clear recent searches
        if (this.clearRecentBtn) {
            this.clearRecentBtn.addEventListener('click', () => {
                this.clearRecentSearches();
            });
        }
    }

    async searchWeather() {
        const city = this.cityInput.value.trim();
        
        if (!city) {
            this.showError('Please enter a city name');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideWeatherData();

        try {
            // Fetch current weather and forecast concurrently
            const [currentResponse, forecastResponse] = await Promise.all([
                fetch(`/api/weather/current?city=${encodeURIComponent(city)}`),
                fetch(`/api/weather/forecast?city=${encodeURIComponent(city)}`)
            ]);

            // Handle current weather response
            if (!currentResponse.ok) {
                const errorData = await currentResponse.json();
                throw new Error(errorData.error || 'Failed to fetch current weather');
            }

            // Handle forecast response
            if (!forecastResponse.ok) {
                const errorData = await forecastResponse.json();
                throw new Error(errorData.error || 'Failed to fetch weather forecast');
            }

            const currentData = await currentResponse.json();
            const forecastData = await forecastResponse.json();

            this.hideLoading();
            this.displayCurrentWeather(currentData);
            this.displayForecast(forecastData.forecasts);
            this.saveRecentSearch(currentData);
            this.displayRecentSearches();
            
            // Fetch and display AI summary
            this.fetchAISummary(city);

        } catch (error) {
            console.error('Error fetching weather data:', error);
            this.hideLoading();
            this.showError(error.message);
        }
    }

    displayCurrentWeather(data) {
        console.log('Displaying current weather:', data);
        this.currentCity.textContent = `${data.city}, ${data.country}`;
        this.currentDescription.textContent = data.description;
        this.currentTemp.textContent = data.temperature;
        this.currentHumidity.textContent = `${data.humidity}%`;
        this.currentWind.textContent = `${data.wind_speed} m/s`;

        // Update animated background based on weather
        this.updateWeatherBackground(data);

        this.currentWeather.style.display = 'block';
        console.log('Current weather section displayed');
    }

    displayForecast(forecasts) {
        console.log('Displaying forecast:', forecasts);
        this.forecastContainer.innerHTML = '';

        forecasts.forEach((forecast, index) => {
            const forecastCard = this.createForecastCard(forecast, index === 0);
            this.forecastContainer.appendChild(forecastCard);
        });

        this.forecastSection.style.display = 'block';
        this.aiSummarySection.style.display = 'block';
        console.log('Forecast section displayed');
    }

    createForecastCard(forecast, isToday = false) {
        const col = document.createElement('div');
        col.className = 'col-12 col-sm-6 col-lg-4 col-xl mb-3';

        const date = new Date(forecast.date);
        const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        col.innerHTML = `
            <div class="card h-100 forecast-card">
                <div class="card-body text-center">
                    <h5 class="card-title">${dayName}</h5>
                    <p class="text-muted small">${dateString}</p>
                    <div class="weather-icon mb-2">
                        <img src="https://openweathermap.org/img/wn/${forecast.icon}@2x.png" 
                             alt="${forecast.description}" 
                             class="img-fluid">
                    </div>
                    <p class="mb-2">${forecast.description}</p>
                    <div class="temperature mb-3">
                        <span class="fs-3 fw-bold">${forecast.temperature}°C</span>
                    </div>
                    <div class="weather-details">
                        <div class="row">
                            <div class="col-6">
                                <i class="fas fa-tint text-info"></i>
                                <small class="d-block">${forecast.humidity}%</small>
                            </div>
                            <div class="col-6">
                                <i class="fas fa-wind text-primary"></i>
                                <small class="d-block">${forecast.wind_speed} m/s</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return col;
    }

    showLoading() {
        this.loading.style.display = 'block';
        this.searchBtn.disabled = true;
        this.searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    }

    hideLoading() {
        this.loading.style.display = 'none';
        this.searchBtn.disabled = false;
        this.searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorAlert.style.display = 'block';
    }

    hideError() {
        this.errorAlert.style.display = 'none';
    }

    hideWeatherData() {
        this.currentWeather.style.display = 'none';
        this.forecastSection.style.display = 'none';
        this.aiSummarySection.style.display = 'none';
    }

    async fetchAISummary(city) {
        // Reset AI summary display states
        this.aiSummaryLoading.style.display = 'block';
        this.aiSummaryContent.style.display = 'none';
        this.aiSummaryError.style.display = 'none';
        
        try {
            const response = await fetch(`/api/weather/summary?city=${encodeURIComponent(city)}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate AI summary');
            }
            
            const summaryData = await response.json();
            this.displayAISummary(summaryData.summary);
            
        } catch (error) {
            console.error('Error fetching AI summary:', error);
            this.showAISummaryError(error.message);
        }
    }
    
    displayAISummary(summary) {
        this.aiSummaryText.textContent = summary;
        this.aiSummaryLoading.style.display = 'none';
        this.aiSummaryContent.style.display = 'block';
        console.log('AI summary displayed:', summary);
    }
    
    showAISummaryError(message) {
        this.aiSummaryErrorText.textContent = message;
        this.aiSummaryLoading.style.display = 'none';
        this.aiSummaryError.style.display = 'block';
    }

    saveRecentSearch(weatherData) {
        let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        
        // Remove duplicate if exists
        recentSearches = recentSearches.filter(search => 
            `${search.city}, ${search.country}` !== `${weatherData.city}, ${weatherData.country}`
        );
        
        // Add new search to beginning
        recentSearches.unshift({
            city: weatherData.city,
            country: weatherData.country,
            temperature: weatherData.temperature,
            description: weatherData.description,
            icon: weatherData.icon,
            wind_speed: weatherData.wind_speed,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 6 searches
        recentSearches = recentSearches.slice(0, 6);
        
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    }

    displayRecentSearches() {
        const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        
        if (recentSearches.length === 0) {
            this.recentSearches.style.display = 'none';
            return;
        }

        this.recentSearchesContainer.innerHTML = '';
        
        recentSearches.forEach(search => {
            const searchCard = this.createRecentSearchCard(search);
            this.recentSearchesContainer.appendChild(searchCard);
        });
        
        this.recentSearches.style.display = 'block';
    }

    createRecentSearchCard(search) {
        const col = document.createElement('div');
        col.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-3';
        
        const timeAgo = this.getTimeAgo(new Date(search.timestamp));
        
        col.innerHTML = `
            <div class="card h-100 recent-search-card" style="cursor: pointer; transition: transform 0.2s;">
                <div class="card-body text-center p-3">
                    <h6 class="card-title mb-2">${search.city}, ${search.country}</h6>
                    <div class="weather-icon mb-2">
                        <img src="https://openweathermap.org/img/wn/${search.icon}.png" 
                             alt="${search.description}" 
                             class="img-fluid" style="width: 40px;">
                    </div>
                    <p class="mb-1 fs-5 fw-bold">${search.temperature}°C</p>
                    <p class="text-muted small mb-2">${search.description}</p>
                    <small class="text-muted">${timeAgo}</small>
                </div>
            </div>
        `;
        
        // Add click handler to re-search this city
        col.addEventListener('click', () => {
            this.cityInput.value = search.city;
            this.searchWeather();
        });
        
        // Add hover effects
        const card = col.querySelector('.card');
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '';
        });
        
        return col;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    }

    clearRecentSearches() {
        localStorage.removeItem('recentSearches');
        this.recentSearches.style.display = 'none';
    }

    initializeSkyline() {
        // Create city skyline buildings
        const buildingTypes = ['tall', 'medium', 'short', 'wide'];
        const buildingCount = 30;
        
        for (let i = 0; i < buildingCount; i++) {
            const building = document.createElement('div');
            building.className = `building ${buildingTypes[Math.floor(Math.random() * buildingTypes.length)]}`;
            building.style.left = `${(i * 50) + Math.random() * 30}px`;
            building.style.animationDelay = `${Math.random() * 4}s`;
            this.citySkyline.appendChild(building);
        }
    }

    initializeWeatherEffects() {
        // This will be called when weather data is received to show appropriate effects
        this.clearWeatherParticles();
    }

    updateWeatherBackground(weatherData) {
        const description = weatherData.description.toLowerCase();
        const icon = weatherData.icon;
        
        // Determine weather type from description and icon
        let weatherType = 'clear';
        
        if (description.includes('rain') || description.includes('drizzle') || icon.includes('09') || icon.includes('10')) {
            weatherType = 'rain';
        } else if (description.includes('cloud') || icon.includes('02') || icon.includes('03') || icon.includes('04')) {
            weatherType = 'clouds';
        } else if (description.includes('clear') || description.includes('sun') || icon.includes('01')) {
            weatherType = 'sunny';
        } else if (description.includes('snow') || icon.includes('13')) {
            weatherType = 'snow';
        }
        
        // Update background
        this.weatherBackground.className = `weather-background ${weatherType}`;
        
        // Update weather effects
        this.showWeatherEffects(weatherType);
        
        console.log(`Weather background updated to: ${weatherType}`);
    }

    showWeatherEffects(weatherType) {
        // Clear existing particles
        this.clearWeatherParticles();
        
        // Hide all weather effects first
        this.sunRays.style.display = 'none';
        this.cloudsContainer.style.opacity = '0';
        
        switch (weatherType) {
            case 'rain':
                this.createRainEffect();
                this.cloudsContainer.style.opacity = '1';
                break;
            case 'snow':
                this.createSnowEffect();
                this.cloudsContainer.style.opacity = '0.8';
                break;
            case 'sunny':
                this.sunRays.style.display = 'block';
                this.cloudsContainer.style.opacity = '0.3';
                break;
            case 'clouds':
                this.cloudsContainer.style.opacity = '1';
                break;
            default:
                this.cloudsContainer.style.opacity = '0.5';
        }
    }

    createRainEffect() {
        const rainDropCount = 50;
        
        for (let i = 0; i < rainDropCount; i++) {
            const rainDrop = document.createElement('div');
            rainDrop.className = 'rain-drop';
            rainDrop.style.left = `${Math.random() * 100}%`;
            rainDrop.style.animationDelay = `${Math.random() * 1}s`;
            rainDrop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
            this.weatherParticles.appendChild(rainDrop);
        }
    }

    createSnowEffect() {
        const snowFlakeCount = 30;
        
        for (let i = 0; i < snowFlakeCount; i++) {
            const snowFlake = document.createElement('div');
            snowFlake.className = 'snow-flake';
            snowFlake.style.left = `${Math.random() * 100}%`;
            snowFlake.style.animationDelay = `${Math.random() * 3}s`;
            snowFlake.style.animationDuration = `${2 + Math.random() * 2}s`;
            this.weatherParticles.appendChild(snowFlake);
        }
    }

    clearWeatherParticles() {
        this.weatherParticles.innerHTML = '';
    }


}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new WeatherApp();
    // Display recent searches on page load
    app.displayRecentSearches();
});

// Add some smooth scrolling when results appear
function smoothScrollToResults() {
    document.getElementById('current-weather').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// Auto-focus on search input
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('city-input').focus();
});
