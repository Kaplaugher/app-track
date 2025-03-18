<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Application } from '../../../db/schema'

const props = defineProps<{
  period: string
  range: DateRange
}>()

interface DateRange {
  start: Date
  end: Date
}

type ApplicationStatus = 'pending' | 'applied' | 'interview' | 'offer' | 'rejected'
type StatusColorMap = Record<ApplicationStatus, 'warning' | 'info' | 'primary' | 'success' | 'error'>

const UBadge = resolveComponent('UBadge')

const { data } = await useAsyncData<Application[]>('recent-applications', async () => {
  // Fetch only the 10 most recent applications
  const applications = await $fetch<Application[]>('/api/applications', {
    params: {
      limit: 10,
      sort: 'date:desc'
    }
  })
  return applications
}, {
  watch: [() => props.period, () => props.range],
  default: () => []
})

const statusColors: StatusColorMap = {
  pending: 'warning',
  applied: 'info',
  interview: 'primary',
  offer: 'success',
  rejected: 'error'
}

const columns: TableColumn<Application>[] = [
  {
    accessorKey: 'companyName',
    header: 'Company',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', undefined, [
          h('p', { class: 'font-medium text-(--ui-text-highlighted)' }, row.original.companyName),
          h('p', { class: 'text-sm text-(--ui-text-muted)' }, row.original.jobTitle)
        ])
      ])
    }
  },
  {
    accessorKey: 'date',
    header: 'Applied',
    cell: ({ row }) => {
      const date = new Date(row.original.date)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status as ApplicationStatus
      const color = statusColors[status] || 'neutral'

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        status
      )
    }
  }
]
</script>

<template>
  <UTable
    :data="data"
    :columns="columns"
    class="shrink-0"
    :ui="{
      base: 'table-fixed border-separate border-spacing-0',
      thead: '[&>tr]:bg-(--ui-bg-elevated)/50 [&>tr]:after:content-none',
      tbody: '[&>tr]:last:[&>td]:border-b-0',
      th: 'first:rounded-l-[calc(var(--ui-radius)*2)] last:rounded-r-[calc(var(--ui-radius)*2)] border-y border-(--ui-border) first:border-l last:border-r',
      td: 'border-b border-(--ui-border)'
    }"
  >
    <template #empty-state>
      <div class="flex flex-col items-center gap-3 py-6">
        <UIcon name="i-lucide-briefcase" class="h-10 w-10 text-(--ui-text-muted)" />
        <p class="text-sm text-(--ui-text-muted)">
          No recent applications
        </p>
      </div>
    </template>
  </UTable>
</template>
