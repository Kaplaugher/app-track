<script setup lang="ts">
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format } from 'date-fns'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { Period, Range } from '~/types'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = {
  date: Date
  applications: number
  responses: number
}

const { width } = useElementSize(cardRef)

// We use `useAsyncData` here to have same random data on the client and server
const { data } = await useAsyncData<DataRecord[]>(async () => {
  const dates = ({
    daily: eachDayOfInterval,
    weekly: eachWeekOfInterval,
    monthly: eachMonthOfInterval
  } as Record<Period, typeof eachDayOfInterval>)[props.period](props.range)

  const minApps = 0
  const maxApps = 5
  const responseRate = 0.4 // 40% response rate

  return dates.map(date => ({
    date,
    applications: Math.floor(Math.random() * (maxApps - minApps + 1)) + minApps,
    responses: Math.floor((Math.random() * (maxApps - minApps + 1)) * responseRate)
  }))
}, {
  watch: [() => props.period, () => props.range],
  default: () => []
})

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.applications
const yResponses = (d: DataRecord) => d.responses

const totalApplications = computed(() => data.value.reduce((acc: number, { applications }) => acc + applications, 0))
const totalResponses = computed(() => data.value.reduce((acc: number, { responses }) => acc + responses, 0))

const formatDate = (date: Date): string => {
  return ({
    daily: format(date, 'd MMM'),
    weekly: format(date, 'd MMM'),
    monthly: format(date, 'MMM yyy')
  })[props.period]
}

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
    return ''
  }

  return formatDate(data.value[i].date)
}

const template = (d: DataRecord) => `${formatDate(d.date)}: ${d.applications} applications (${d.responses} responses)`
</script>

<template>
  <UCard ref="cardRef" :ui="{ body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div>
        <p class="text-xs text-(--ui-text-muted) uppercase mb-1.5">
          Application Activity
        </p>
        <div class="flex items-center gap-4">
          <p class="text-3xl text-(--ui-text-highlighted) font-semibold">
            {{ totalApplications }} <span class="text-base">applications</span>
          </p>
          <p class="text-xl text-(--ui-text-muted)">
            {{ totalResponses }} <span class="text-sm">responses</span>
          </p>
        </div>
      </div>
    </template>

    <VisXYContainer
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width"
    >
      <VisLine
        :x="x"
        :y="y"
        color="var(--ui-primary)"
      />
      <VisArea
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :opacity="0.1"
      />

      <VisLine
        :x="x"
        :y="yResponses"
        color="var(--ui-success)"
        :stroke-width="2"
        :stroke-dasharray="[4, 4]"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
