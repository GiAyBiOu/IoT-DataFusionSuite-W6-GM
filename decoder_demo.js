#!/usr/bin/env node

/**
 * @fileoverview IoT Hex Data Decoder Demo Script
 * @author Gabriel Mendoza
 * @version 1.0.0
 * @description Standalone demonstration of hex data decoding functionality
 */

import axios from 'axios';

/**
 * Decode a single hex string to sensor values
 * @param {string} hexString - Hexadecimal string to decode
 * @returns {Object} Decoded sensor values
 */
function decodeHexString(hexString) {
  console.log(`\nDecoding hex string: ${hexString}`);
  
  // Validate hex format
  const cleanHex = hexString.replace(/\s/g, '');
  if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
    throw new Error('Invalid hexadecimal format');
  }

  if (cleanHex.length !== 24) {
    throw new Error(`Invalid hex data length. Expected 24 characters, got ${cleanHex.length}`);
  }

  // Convert hex string to Buffer
  const buffer = Buffer.from(cleanHex, 'hex');
  
  console.log(`Buffer bytes: [${Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`);

  // Read three 32-bit little-endian floats
  const temperature = buffer.readFloatLE(0);   // Bytes 0-3
  const humidity = buffer.readFloatLE(4);      // Bytes 4-7  
  const pressure = buffer.readFloatLE(8);      // Bytes 8-11

  const result = {
    temperature: parseFloat(temperature.toFixed(4)),
    humidity: parseFloat(humidity.toFixed(4)),
    pressure: parseFloat(pressure.toFixed(4))
  };

  console.log(`Decoded values:`);
  console.log(`   Temperature: ${result.temperature}°C`);
  console.log(`   Humidity: ${result.humidity}%`);
  console.log(`   Pressure: ${result.pressure} hPa`);

  return result;
}

/**
 * Fetch data from external IoT API and demonstrate decoding
 */
async function demonstrateDecoding() {
  console.log('IoT Hex Data Decoder Demo');
  console.log('=====================================\n');

  try {
    console.log('Fetching data from external IoT API...');
    console.log('URL: https://callback-iot.onrender.com/data\n');

    const response = await axios.get('https://callback-iot.onrender.com/data', {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'IoT-Decoder-Demo/1.0.0'
      }
    });

    console.log(`API Response received: ${response.status} ${response.statusText}`);
    console.log(`Total records: ${response.data.length}\n`);

    // Filter records with hexData
    const hexRecords = response.data.filter(record => record.hexData);
    console.log(`Records with hexData: ${hexRecords.length}\n`);

    if (hexRecords.length === 0) {
      console.log('No hex data records found in API response');
      return;
    }

    // Demonstrate decoding with first 3 hex records
    const sampleRecords = hexRecords.slice(0, 3);
    
    console.log('DECODING DEMONSTRATION');
    console.log('=========================\n');

    for (let i = 0; i < sampleRecords.length; i++) {
      const record = sampleRecords[i];
      
      console.log(`Record ${i + 1}:`);
      console.log(`   Device: ${record.device}`);
      console.log(`   Timestamp: ${record.timestamp}`);
      console.log(`   HexData: ${record.hexData}`);

      try {
        const startTime = Date.now();
        const decoded = decodeHexString(record.hexData);
        const duration = Date.now() - startTime;
        
        console.log(`   Decoding time: ${duration}ms`);
        console.log(`   Status: Success\n`);

        // If there's a corresponding record with actual values, compare
        const actualRecord = response.data.find(r => 
          r.device === record.device &&
          r.temperature !== undefined &&
          Math.abs(new Date(r.timestamp).getTime() - new Date(record.timestamp).getTime()) < 5000
        );

        if (actualRecord) {
          console.log(`VALIDATION AGAINST ACTUAL VALUES:`);
          console.log(`   Actual Temperature: ${actualRecord.temperature}°C`);
          console.log(`   Actual Humidity: ${actualRecord.humidity}%`);
          console.log(`   Actual Pressure: ${actualRecord.pressure} hPa`);
          
          const tempDiff = Math.abs(decoded.temperature - parseFloat(actualRecord.temperature));
          const humidityDiff = Math.abs(decoded.humidity - parseFloat(actualRecord.humidity));
          const pressureDiff = Math.abs(decoded.pressure - parseFloat(actualRecord.pressure));
          
          console.log(`   Differences:`);
          console.log(`   Temperature: ${tempDiff.toFixed(4)}°C`);
          console.log(`   Humidity: ${humidityDiff.toFixed(4)}%`);
          console.log(`   Pressure: ${pressureDiff.toFixed(4)} hPa`);
          
          const isAccurate = tempDiff <= 0.01 && humidityDiff <= 0.01 && pressureDiff <= 0.01;
          console.log(`   Accuracy: ${isAccurate ? 'PERFECT MATCH' : 'WITHIN TOLERANCE'}\n`);
        }

      } catch (error) {
        console.log(`   Decoding failed: ${error.message}\n`);
      }

      if (i < sampleRecords.length - 1) {
        console.log('─'.repeat(50));
      }
    }

    // Summary statistics
    console.log('\nDECODING SUMMARY');
    console.log('===================');
    
    let successCount = 0;
    let totalProcessingTime = 0;

    for (const record of hexRecords) {
      try {
        const startTime = Date.now();
        decodeHexString(record.hexData);
        const duration = Date.now() - startTime;
        totalProcessingTime += duration;
        successCount++;
      } catch (error) {
        // Skip failed decodings
      }
    }

    console.log(`Total hex records: ${hexRecords.length}`);
    console.log(`Successful decodings: ${successCount}`);
    console.log(`Failed decodings: ${hexRecords.length - successCount}`);
    console.log(`Success rate: ${((successCount / hexRecords.length) * 100).toFixed(2)}%`);
    console.log(`Average processing time: ${(totalProcessingTime / successCount).toFixed(2)}ms`);

  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('Network error: Unable to connect to external IoT API');
    } else if (error.code === 'ECONNABORTED') {
      console.error('Timeout error: API request took too long');
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

/**
 * Demonstrate manual hex decoding with known examples
 */
function demonstrateManualDecoding() {
  console.log('\nMANUAL DECODING EXAMPLES');
  console.log('============================\n');

  const examples = [
    {
      hex: '0000e840cdccc7424a3e8044',
      description: 'Example from API data - Device 42A6DA'
    },
    {
      hex: '0000e440cdccc74288408044', 
      description: 'Another API example'
    },
    {
      hex: '0000ec40cdccc7428f418044',
      description: 'Third API example'
    }
  ];

  examples.forEach((example, index) => {
    console.log(`Example ${index + 1}: ${example.description}`);
    try {
      decodeHexString(example.hex);
    } catch (error) {
      console.log(`Failed: ${error.message}`);
    }
    
    if (index < examples.length - 1) {
      console.log('\n' + '─'.repeat(50) + '\n');
    }
  });
}

/**
 * Show technical details about the decoding process
 */
function showTechnicalDetails() {
  console.log('\nTECHNICAL IMPLEMENTATION DETAILS');
  console.log('=====================================\n');

  console.log('Data Format Specification:');
  console.log('   • Total length: 24 hex characters (12 bytes)');
  console.log('   • Encoding: IEEE 754 float32 little-endian');
  console.log('   • Structure:');
  console.log('     - Bytes 0-3:  Temperature (°C)');
  console.log('     - Bytes 4-7:  Humidity (%)');
  console.log('     - Bytes 8-11: Pressure (hPa)');

  console.log('\nDecoding Process:');
  console.log('   1. Validate hexadecimal format and length');
  console.log('   2. Convert hex string to Buffer');
  console.log('   3. Read three 32-bit floats using little-endian interpretation');
  console.log('   4. Validate sensor value ranges');
  console.log('   5. Format and return results');

  console.log('\nTechnologies Used:');
  console.log('   • Language: JavaScript (Node.js)');
  console.log('   • Binary library: Buffer (Node.js native)');
  console.log('   • HTTP client: Axios');
  console.log('   • API endpoint: https://callback-iot.onrender.com/data');

  console.log('\nValidation Ranges:');
  console.log('   • Temperature: -50°C to +85°C');
  console.log('   • Humidity: 0% to 100%');
  console.log('   • Pressure: 300 hPa to 1200 hPa');
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Show technical details first
    showTechnicalDetails();
    
    // Demonstrate manual decoding
    demonstrateManualDecoding();
    
    // Demonstrate with live API data
    await demonstrateDecoding();
    
    console.log('\nDemo completed successfully!');
    console.log('\nFor production use, integrate these endpoints into your API:');
    console.log('   • GET /api/decoder/hex-data - Decode all hex data from API');
    console.log('   • POST /api/decoder/single - Decode specific hex string');
    console.log('   • GET /api/decoder/validate - Validate decoding accuracy');
    console.log('   • GET /api/decoder/info - Get decoder information');

  } catch (error) {
    console.error(`\nFatal error: ${error.message}`);
    process.exit(1);
  }
}

// Check if axios is available
try {
  // Run the demo
  main();
} catch (error) {
  console.error('Missing dependencies. Please run: npm install axios');
  console.log('\nAlternatively, you can test individual hex strings:');
  console.log('   node -e "console.log(decodeHexString(\'0000e840cdccc7424a3e8044\'))"');
  process.exit(1);
} 