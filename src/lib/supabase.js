import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MzM1MzQsImV4cCI6MjA2MTEwOTUzNH0.zCmsTbBROzWGOBLT6cZ06AmKB6t-OpwhJ-uIvL_22UY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
