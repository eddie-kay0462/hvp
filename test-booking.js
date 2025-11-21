#!/usr/bin/env node

/**
 * Booking Endpoints Test Script
 * Tests the complete booking flow
 */

const BASE_URL = 'http://localhost:3000';
const SELLER_EMAIL = `seller${Date.now()}@test.com`;
const BUYER_EMAIL = `buyer${Date.now()}@test.com`;
const PASSWORD = 'password123';

let sellerToken = null;
let buyerToken = null;
let serviceId = null;
let bookingId = null;

// Helper function to make API calls
async function apiCall(method, endpoint, token = null, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

// Helper to print section headers
function printSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60) + '\n');
}

// Helper to print results
function printResult(label, result) {
  console.log(`${label}:`);
  console.log(JSON.stringify(result, null, 2));
  console.log('');
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Booking Endpoints Test...\n');

  // ============================================
  // STEP 1: Create Seller User
  // ============================================
  printSection('STEP 1: Creating Seller User');
  
  const sellerSignup = await apiCall('POST', '/api/auth/signup', null, {
    email: SELLER_EMAIL,
    password: PASSWORD,
    firstName: 'Seller',
    lastName: 'User',
    phoneNumber: '233123456789',
    role: 'seller'
  });

  printResult('Seller Signup', sellerSignup.data);
  
  if (sellerSignup.status !== 201) {
    console.log('⚠️  Note: You may need to verify the seller email before proceeding');
    console.log(`   Email: ${SELLER_EMAIL}\n`);
  }

  // ============================================
  // STEP 2: Login as Seller
  // ============================================
  printSection('STEP 2: Logging in as Seller');

  const sellerLogin = await apiCall('POST', '/api/auth/login', null, {
    email: SELLER_EMAIL,
    password: PASSWORD
  });

  printResult('Seller Login', sellerLogin.data);

  sellerToken = sellerLogin.data?.data?.session?.access_token;

  if (!sellerToken) {
    console.log('❌ Failed to get seller access token. Make sure email is verified.');
    console.log('   Please verify the email and run the script again.');
    return;
  }

  console.log('✅ Seller token obtained\n');

  // ============================================
  // STEP 3: Setup Seller Profile
  // ============================================
  printSection('STEP 3: Setting up Seller Profile');

  const sellerSetup = await apiCall('POST', '/api/sellers/setup', sellerToken, {
    title: 'Professional Design Services',
    description: 'I provide professional design services',
    category: 'design',
    default_price: 100.00,
    default_delivery_time: 5,
    express_price: 150.00,
    express_delivery_time: 2,
    portfolio: 'https://example.com/portfolio'
  });

  printResult('Seller Setup', sellerSetup.data);

  // ============================================
  // STEP 4: Create Service
  // ============================================
  printSection('STEP 4: Creating Service');

  const createService = await apiCall('POST', '/api/sellers/create-service', sellerToken, {
    title: 'Logo Design Service',
    description: 'Professional logo design for your business',
    category: 'design',
    default_price: 75.00,
    default_delivery_time: 3,
    express_price: 120.00,
    express_delivery_time: 1,
    portfolio: 'https://example.com/logo-portfolio'
  });

  printResult('Create Service', createService.data);

  serviceId = createService.data?.data?.id;

  if (!serviceId) {
    console.log('❌ Failed to create service');
    return;
  }

  console.log(`✅ Service created with ID: ${serviceId}`);
  console.log('\n⚠️  IMPORTANT: You need to manually verify the service in your database');
  console.log(`   Set is_verified = true for service ID: ${serviceId}`);
  console.log('   Press Enter after verifying the service in Supabase...\n');
  
  // Wait for user input (in a real scenario, you'd use readline)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================
  // STEP 5: Create Buyer User
  // ============================================
  printSection('STEP 5: Creating Buyer User');

  const buyerSignup = await apiCall('POST', '/api/auth/signup', null, {
    email: BUYER_EMAIL,
    password: PASSWORD,
    firstName: 'Buyer',
    lastName: 'User',
    phoneNumber: '233987654321',
    role: 'customer'
  });

  printResult('Buyer Signup', buyerSignup.data);

  console.log('⚠️  Note: You may need to verify the buyer email before proceeding');
  console.log(`   Email: ${BUYER_EMAIL}\n`);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================
  // STEP 6: Login as Buyer
  // ============================================
  printSection('STEP 6: Logging in as Buyer');

  const buyerLogin = await apiCall('POST', '/api/auth/login', null, {
    email: BUYER_EMAIL,
    password: PASSWORD
  });

  printResult('Buyer Login', buyerLogin.data);

  buyerToken = buyerLogin.data?.data?.session?.access_token;

  if (!buyerToken) {
    console.log('❌ Failed to get buyer access token. Make sure email is verified.');
    console.log('   Please verify the email and run the script again.');
    return;
  }

  console.log('✅ Buyer token obtained\n');

  // ============================================
  // STEP 7: Book Service
  // ============================================
  printSection('STEP 7: Booking Service');

  // Get future date (7 days from now)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const dateString = futureDate.toISOString().split('T')[0];

  const bookNow = await apiCall('POST', '/api/bookings/book-now', buyerToken, {
    serviceId: serviceId,
    date: dateString,
    time: '14:00',
    status: 'pending'
  });

  printResult('Book Now', bookNow.data);

  bookingId = bookNow.data?.data?.id;

  if (!bookingId) {
    console.log('❌ Failed to create booking');
    console.log('   Make sure:');
    console.log('   1. Service is verified (is_verified = true)');
    console.log('   2. Service is active (is_active = true)');
    return;
  }

  console.log(`✅ Booking created with ID: ${bookingId}\n`);

  // ============================================
  // STEP 8: Get Buyer Bookings
  // ============================================
  printSection('STEP 8: Getting Buyer Bookings');

  const getBuyerBookings = await apiCall('GET', '/api/bookings?role=buyer', buyerToken);
  printResult('Buyer Bookings', getBuyerBookings.data);

  // ============================================
  // STEP 9: Get Seller Bookings
  // ============================================
  printSection('STEP 9: Getting Seller Bookings');

  const getSellerBookings = await apiCall('GET', '/api/bookings?role=seller', sellerToken);
  printResult('Seller Bookings', getSellerBookings.data);

  // ============================================
  // STEP 10: Get Booking by ID (as Buyer)
  // ============================================
  printSection('STEP 10: Getting Booking by ID (as Buyer)');

  if (bookingId) {
    const getBooking = await apiCall('GET', `/api/bookings/${bookingId}`, buyerToken);
    printResult('Get Booking (Buyer)', getBooking.data);
  }

  // ============================================
  // STEP 11: Get Booking by ID (as Seller)
  // ============================================
  printSection('STEP 11: Getting Booking by ID (as Seller)');

  if (bookingId) {
    const getBookingSeller = await apiCall('GET', `/api/bookings/${bookingId}`, sellerToken);
    printResult('Get Booking (Seller)', getBookingSeller.data);
  }

  // ============================================
  // STEP 12: Test Error Cases
  // ============================================
  printSection('STEP 12: Testing Error Cases');

  console.log('Testing: Booking own service (should fail)');
  const bookOwnService = await apiCall('POST', '/api/bookings/book-now', sellerToken, {
    serviceId: serviceId,
    date: dateString,
    time: '15:00'
  });
  printResult('Book Own Service (Error)', bookOwnService.data);

  console.log('Testing: Booking with past date (should fail)');
  const bookPast = await apiCall('POST', '/api/bookings/book-now', buyerToken, {
    serviceId: serviceId,
    date: '2020-01-01',
    time: '12:00'
  });
  printResult('Book Past Date (Error)', bookPast.data);

  // ============================================
  // Summary
  // ============================================
  printSection('TEST SUMMARY');

  console.log('✅ Test Flow Completed!\n');
  console.log('Summary:');
  console.log(`  - Seller User: ${SELLER_EMAIL}`);
  console.log(`  - Buyer User: ${BUYER_EMAIL}`);
  console.log(`  - Service ID: ${serviceId}`);
  if (bookingId) {
    console.log(`  - Booking ID: ${bookingId}`);
  }
  console.log('\n✅ All booking endpoints have been tested!');
}

// Run the tests
runTests().catch(console.error);

