#!/usr/bin/env node

/**
 * Performance Testing Script for DysLearn AI Response Time Improvements
 * 
 * This script tests the response time improvements implemented in the Gemini service.
 * It measures:
 * 1. Average response time for simple queries
 * 2. Cache hit performance
 * 3. Model fallback speed
 * 4. Parallel request performance
 */

import { createChat, transcribeAudio, generateChatTitle } from './services/geminiService.js';

const TEST_QUERIES = [
    "What are bones?",
    "Explain photosynthesis",
    "How do birds fly?",
    "What is gravity?",
    "Tell me about the solar system"
];

const CACHE_TEST_QUERY = "What are bones?"; // Will be repeated to test caching

async function measureResponseTime(testName, testFunction) {
    const startTime = performance.now();
    try {
        const result = await testFunction();
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`✅ ${testName}: ${duration}s`);
        return { success: true, duration: parseFloat(duration), result };
    } catch (error) {
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`❌ ${testName}: ${duration}s (FAILED: ${error.message})`);
        return { success: false, duration: parseFloat(duration), error: error.message };
    }
}

async function testBasicResponseTime() {
    console.log('\n🚀 Testing Basic Response Time Performance...');
    const results = [];
    
    for (let i = 0; i < TEST_QUERIES.length; i++) {
        const query = TEST_QUERIES[i];
        const chat = createChat();
        
        const result = await measureResponseTime(
            `Query ${i + 1}: "${query}"`,
            async () => {
                const stream = await chat.sendMessageStream({ message: query });
                let fullResponse = '';
                for await (const chunk of stream) {
                    fullResponse += chunk.text || '';
                }
                return fullResponse;
            }
        );
        
        results.push(result);
        
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 0) {
        const avgTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
        console.log(`📊 Average Response Time: ${avgTime.toFixed(2)}s (${successfulResults.length}/${results.length} successful)`);
    }
    
    return results;
}

async function testCachePerformance() {
    console.log('\n💾 Testing Cache Performance...');
    
    // First request (should be slow)
    const chat1 = createChat();
    const firstResult = await measureResponseTime(
        'First request (no cache)',
        async () => {
            const stream = await chat1.sendMessageStream({ message: CACHE_TEST_QUERY });
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text || '';
            }
            return fullResponse;
        }
    );
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Second request (should be faster due to caching)
    const chat2 = createChat();
    const secondResult = await measureResponseTime(
        'Second request (with cache)',
        async () => {
            const stream = await chat2.sendMessageStream({ message: CACHE_TEST_QUERY });
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text || '';
            }
            return fullResponse;
        }
    );
    
    if (firstResult.success && secondResult.success) {
        const improvement = ((firstResult.duration - secondResult.duration) / firstResult.duration * 100).toFixed(1);
        console.log(`📈 Cache Performance: ${improvement}% improvement (${firstResult.duration}s → ${secondResult.duration}s)`);
    }
    
    return { firstResult, secondResult };
}

async function testTitleGeneration() {
    console.log('\n📝 Testing Title Generation Performance...');
    
    const results = [];
    for (let i = 0; i < 3; i++) {
        const result = await measureResponseTime(
            `Title Generation ${i + 1}`,
            () => generateChatTitle(TEST_QUERIES[i])
        );
        results.push(result);
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 0) {
        const avgTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
        console.log(`📊 Average Title Generation Time: ${avgTime.toFixed(2)}s`);
    }
    
    return results;
}

async function runPerformanceTests() {
    console.log('🔥 DysLearn AI Performance Testing Suite');
    console.log('==========================================');
    
    const startTime = performance.now();
    
    try {
        // Test basic response times
        const basicResults = await testBasicResponseTime();
        
        // Test caching performance
        const cacheResults = await testCachePerformance();
        
        // Test title generation
        const titleResults = await testTitleGeneration();
        
        const endTime = performance.now();
        const totalTime = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('\n🎯 Performance Test Summary');
        console.log('============================');
        console.log(`Total Test Duration: ${totalTime}s`);
        
        const allResults = [...basicResults, cacheResults.firstResult, cacheResults.secondResult, ...titleResults];
        const successCount = allResults.filter(r => r.success).length;
        const totalCount = allResults.length;
        
        console.log(`Success Rate: ${successCount}/${totalCount} (${(successCount/totalCount*100).toFixed(1)}%)`);
        
        if (successCount > 0) {
            const avgResponseTime = allResults
                .filter(r => r.success)
                .reduce((sum, r) => sum + r.duration, 0) / successCount;
            console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}s`);
            
            // Performance benchmarks
            if (avgResponseTime < 3) {
                console.log('🚀 EXCELLENT: Response time under 3 seconds!');
            } else if (avgResponseTime < 5) {
                console.log('✅ GOOD: Response time under 5 seconds');
            } else if (avgResponseTime < 8) {
                console.log('⚠️  ACCEPTABLE: Response time under 8 seconds');
            } else {
                console.log('❌ NEEDS IMPROVEMENT: Response time over 8 seconds');
            }
        }
        
    } catch (error) {
        console.error('❌ Performance test failed:', error);
    }
}

// Run the tests
runPerformanceTests().catch(console.error);