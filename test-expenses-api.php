#!/usr/bin/env php
<?php

// Test script to verify expenses API
$baseUrl = 'http://localhost:5000';

// Step 1: Login
$ch = curl_init($baseUrl . '/auth/login');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['username' => 'admin', 'password' => 'admin123']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_COOKIEJAR, '/tmp/cookie.txt');
curl_setopt($ch, CURLOPT_COOKIEFILE, '/tmp/cookie.txt');

$loginResp = curl_exec($ch);
$loginData = json_decode($loginResp, true);
curl_close($ch);

echo "Login response:\n";
print_r($loginData);
echo "\n";

if (!$loginData['success']) {
    echo "Failed to login!\n";
    exit(1);
}

// Step 2: Get expenses
$ch = curl_init($baseUrl . '/expenses');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIEFILE, '/tmp/cookie.txt');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$expensesResp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Expenses API response (HTTP $httpCode):\n";
echo $expensesResp . "\n\n";

// Try to decode and pretty print
$expensesData = json_decode($expensesResp, true);
if ($expensesData) {
    echo "Decoded expenses data:\n";
    print_r($expensesData);
} else {
    echo "Failed to decode JSON response\n";
}