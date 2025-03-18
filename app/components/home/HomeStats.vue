<script setup lang="ts">
import type { Period, Range, Stat } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

const baseStats = [{
  title: 'Applications',
  icon: 'i-lucide-file-text',
  minValue: 10,
  maxValue: 50,
  minVariation: -10,
  maxVariation: 25
}, {
  title: 'Response Rate',
  icon: 'i-lucide-percent',
  minValue: 20,
  maxValue: 60,
  minVariation: -15,
  maxVariation: 20
}, {
  title: 'Interviews',
  icon: 'i-lucide-users',
  minValue: 0,
  maxValue: 10,
  minVariation: -20,
  maxVariation: 30
}, {
  title: 'Active Apps',
  icon: 'i-lucide-hourglass',
  minValue: 5,
  maxValue: 25,
  minVariation: -5,
  maxVariation: 15
}]

const { data: stats } = await useAsyncData<Stat[]>('stats', async () => {
  return baseStats.map((stat) => {
    const value = randomInt(stat.minValue, stat.maxValue)
    const variation = randomInt(stat.minVariation, stat.maxVariation)

    return {
      title: stat.title,
      icon: stat.icon,
      value: value,
      variation
    }
  })
}, {
  watch: [() => props.period, () => props.range],
  default: () => []
})
</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      to="/customers"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        leading: 'p-2.5 rounded-full bg-(--ui-primary)/10 ring ring-inset ring-(--ui-primary)/25',
        title: 'font-normal text-(--ui-text-muted) text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-[calc(var(--ui-radius)*2)] last:rounded-r-[calc(var(--ui-radius)*2)] hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-(--ui-text-highlighted)">
          {{ stat.value }}
        </span>

        <UBadge
          :color="stat.variation > 0 ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ stat.variation > 0 ? '+' : '' }}{{ stat.variation }}%
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
