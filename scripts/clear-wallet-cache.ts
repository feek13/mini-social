#!/usr/bin/env node
/**
 * Script to clear wallet snapshot cache
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
try {
  const envPath = join(process.cwd(), '.env.local')
  const envFile = readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch (error) {
  console.warn('⚠️  Could not load .env.local file')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearWalletCache(address?: string) {
  console.log('🧹 Clearing wallet snapshot cache...')

  try {
    let query = supabase.from('wallet_snapshots').delete()

    if (address) {
      const formattedAddress = address.toLowerCase()
      query = query.eq('wallet_address', formattedAddress)
      console.log(`   Address: ${formattedAddress}`)
    } else {
      console.log('   Clearing ALL wallet snapshots')
    }

    const { error, count } = await query.select()

    if (error) {
      console.error('❌ Error:', error.message)
      process.exit(1)
    }

    console.log(`✅ Cleared ${count || 0} snapshot(s)`)
  } catch (error) {
    console.error('❌ Failed:', error)
    process.exit(1)
  }
}

// Get address from command line argument
const address = process.argv[2]

clearWalletCache(address).then(() => {
  console.log('✨ Done!')
  process.exit(0)
})
