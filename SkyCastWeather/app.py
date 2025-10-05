import os
import logging
import requests
from flask import Flask, render_template, jsonify, request
from google import genai
from google.genai import types

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

ERROR_RESPONSES = {
    404: ('City not found. Please check the spelling and try again.', 404),
    401: ('API key invalid. Please contact support.', 401),
    'default': ('Weather service temporarily unavailable. Please try again later.', 503),
    'timeout': ('Request timed out. Please try again.', 408),
    'connection': ('Unable to connect to weather service. Please check your internet connection.', 503),
    'unexpected': ('An unexpected error occurred. Please try again.', 500)
}

def handle_weather_api_error(response):
    """Handle OpenWeather API errors"""
    if response.status_code in ERROR_RESPONSES:
        return jsonify({'error': ERROR_RESPONSES[response.status_code][0]}), ERROR_RESPONSES[response.status_code][1]
    return jsonify({'error': ERROR_RESPONSES['default'][0]}), ERROR_RESPONSES['default'][1]

def fetch_weather_data(endpoint, city):
    """Fetch weather data from OpenWeather API"""
    try:
        response = requests.get(
            f"{OPENWEATHER_BASE_URL}/{endpoint}",
            params={'q': city, 'appid': OPENWEATHER_API_KEY, 'units': 'metric'},
            timeout=10
        )
        if response.status_code == 200:
            return response.json(), None
        return None, handle_weather_api_error(response)
    except requests.exceptions.Timeout:
        return None, (jsonify({'error': ERROR_RESPONSES['timeout'][0]}), ERROR_RESPONSES['timeout'][1])
    except requests.exceptions.ConnectionError:
        return None, (jsonify({'error': ERROR_RESPONSES['connection'][0]}), ERROR_RESPONSES['connection'][1])
    except Exception as e:
        app.logger.error(f"Error fetching weather data: {str(e)}")
        return None, (jsonify({'error': ERROR_RESPONSES['unexpected'][0]}), ERROR_RESPONSES['unexpected'][1])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/weather/current')
def get_current_weather():
    city = request.args.get('city')
    if not city:
        return jsonify({'error': 'City parameter is required'}), 400
    
    data, error = fetch_weather_data('weather', city)
    if error:
        return error
    
    return jsonify({
        'city': data['name'],
        'country': data['sys']['country'],
        'temperature': round(data['main']['temp']),
        'humidity': data['main']['humidity'],
        'description': data['weather'][0]['description'].title(),
        'icon': data['weather'][0]['icon'],
        'wind_speed': round(data.get('wind', {}).get('speed', 0), 1)
    })

@app.route('/api/weather/forecast')
def get_forecast():
    city = request.args.get('city')
    if not city:
        return jsonify({'error': 'City parameter is required'}), 400
    
    data, error = fetch_weather_data('forecast', city)
    if error:
        return error
    
    forecasts = []
    processed_dates = set()
    
    for item in data['list']:
        date = item['dt_txt'][:10]
        if date not in processed_dates:
            processed_dates.add(date)
            forecasts.append({
                'date': date,
                'temperature': round(item['main']['temp']),
                'humidity': item['main']['humidity'],
                'description': item['weather'][0]['description'].title(),
                'icon': item['weather'][0]['icon'],
                'wind_speed': round(item.get('wind', {}).get('speed', 0), 1)
            })
            if len(forecasts) >= 5:
                break
    
    return jsonify({'forecasts': forecasts})

@app.route('/api/weather/summary')
def get_ai_summary():
    city = request.args.get('city')
    if not city:
        return jsonify({'error': 'City parameter is required'}), 400
    
    if not gemini_client:
        return jsonify({'error': 'AI service not available. Gemini API key not configured.'}), 503
    
    try:
        current_data, error1 = fetch_weather_data('weather', city)
        forecast_data, error2 = fetch_weather_data('forecast', city)
        
        if error1 or error2:
            return jsonify({'error': 'Unable to fetch weather data for summary generation.'}), 503
        
        weather_info = {
            'city': current_data['name'],
            'country': current_data['sys']['country'],
            'current': {
                'temp': round(current_data['main']['temp']),
                'description': current_data['weather'][0]['description'],
                'wind_speed': round(current_data.get('wind', {}).get('speed', 0), 1),
                'humidity': current_data['main']['humidity']
            },
            'forecast': []
        }
        
        processed_dates = set()
        for item in forecast_data['list']:
            date = item['dt_txt'][:10]
            if date not in processed_dates and len(weather_info['forecast']) < 3:
                processed_dates.add(date)
                weather_info['forecast'].append({
                    'date': date,
                    'temp': round(item['main']['temp']),
                    'description': item['weather'][0]['description'],
                    'wind_speed': round(item.get('wind', {}).get('speed', 0), 1),
                    'humidity': item['main']['humidity']
                })
        
        prompt = f"""Create a friendly weather summary for {weather_info['city']}, {weather_info['country']}. 
Current: {weather_info['current']['temp']}°C, {weather_info['current']['description']}, wind {weather_info['current']['wind_speed']} m/s, humidity {weather_info['current']['humidity']}%.
Forecast: {weather_info['forecast']}
Create a natural 2-3 sentence summary with temperature trends and key details."""
        
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=types.GenerateContentConfig(max_output_tokens=150, temperature=0.7)
        )
        
        summary_text = response.text.strip() if response.text else 'Weather summary unavailable at the moment.'
        return jsonify({'summary': summary_text})
        
    except Exception as e:
        app.logger.error(f"Error generating AI summary: {str(e)}")
        return jsonify({'error': 'Unable to generate weather summary. Please try again.'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
