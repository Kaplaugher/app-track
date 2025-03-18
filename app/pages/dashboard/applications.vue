<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { getPaginationRowModel, type Row } from '@tanstack/table-core'
import type { Application } from '../../../db/schema'

definePageMeta({
  layout: 'dashboard'
})

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const toast = useToast()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = useTemplateRef<any>('table')
const selectedApplication = ref<Application | null>(null)
const editModalRef = ref<{ open: boolean } | null>(null)
const deleteModalRef = ref<{ open: boolean } | null>(null)
const customResumeModalRef = ref<{ open: boolean } | null>(null)

const columnFilters = ref([{
  id: 'companyName',
  value: ''
}])
const columnVisibility = ref()
const rowSelection = ref({})

const { data, status } = await useFetch<Application[]>('/api/applications', {
  key: 'applications',
  lazy: true
})

interface DeleteResponse {
  success: boolean
  data?: {
    deleted: number
    ids: number[]
  }
  error?: string
}

// Function to delete a single application
async function deleteApplication(id: number) {
  try {
    const response = await $fetch<DeleteResponse>('/api/applications/delete', {
      method: 'POST',
      body: {
        id
      }
    })

    if (response.success) {
      toast.add({
        title: 'Application deleted',
        description: 'The application has been deleted successfully.'
      })
      // Refresh the applications list
      refreshNuxtData('applications')
    } else {
      throw new Error(response.error || 'Failed to delete application')
    }
  } catch (error) {
    console.error('Error deleting application:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to delete application. Please try again.',
      color: 'error'
    })
  }
}

function getRowItems(row: Row<Application>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Copy application ID',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.id.toString())
        toast.add({
          title: 'Copied to clipboard',
          description: 'Application ID copied to clipboard'
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Edit application',
      icon: 'i-lucide-pencil',
      onSelect() {
        selectedApplication.value = row.original
        if (editModalRef.value) {
          editModalRef.value.open = true
        }
      }
    },

    {
      label: 'Generate Custom Resume',
      icon: 'i-lucide-file-plus',
      onSelect() {
        selectedApplication.value = row.original
        if (customResumeModalRef.value) {
          customResumeModalRef.value.open = true
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Delete application',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect() {
        deleteApplication(row.original.id)
      }
    }
  ]
}

// Get selected row IDs for bulk delete
const getSelectedIds = computed((): number[] => {
  if (!table?.value?.tableApi) return []

  return table.value.tableApi.getFilteredSelectedRowModel().rows.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row: any) => row.original.id
  )
})

const columns: TableColumn<Application>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'ariaLabel': 'Select row'
      })
  },
  {
    accessorKey: 'id',
    header: 'ID'
  },
  {
    accessorKey: 'companyName',
    header: 'Company',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', undefined, [
          h('p', { class: 'font-medium text-(--ui-text-highlighted)' }, row.original.companyName),
          h('p', { class: '' }, row.original.jobTitle)
        ])
      ])
    }
  },
  {
    accessorKey: 'email',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Email',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
  },
  {
    accessorKey: 'date',
    header: 'Date Applied',
    cell: ({ row }) => {
      const date = new Date(row.original.date)
      return date.toLocaleDateString()
    }
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      return `$${row.original.amount}`
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    filterFn: 'equals',
    cell: ({ row }) => {
      const color = {
        pending: 'warning' as const,
        applied: 'info' as const,
        interview: 'primary' as const,
        offer: 'success' as const,
        rejected: 'error' as const
      }[row.original.status] || 'neutral' as const

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.original.status
      )
    }
  },
  {
    accessorKey: 'favorite',
    header: 'Favorite',
    cell: ({ row }) => {
      if (!row.original.favorite) return null

      return h('div', { class: 'flex justify-center' }, [
        h(resolveComponent('UIcon'), {
          name: 'i-lucide-star',
          class: 'text-amber-500 w-5 h-5 fill-current'
        })
      ])
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          {
            content: {
              align: 'end'
            },
            items: getRowItems(row)
          },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost',
              class: 'ml-auto'
            })
        )
      )
    }
  }
]

const statusFilter = ref('all')

watch(() => statusFilter.value, (newVal) => {
  if (!table?.value?.tableApi) return

  const statusColumn = table.value.tableApi.getColumn('status')
  if (!statusColumn) return

  if (newVal === 'all') {
    statusColumn.setFilterValue(undefined)
  } else {
    statusColumn.setFilterValue(newVal)
  }
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})
</script>

<template>
  <UDashboardPanel id="applications">
    <template #header>
      <UDashboardNavbar title="Applications">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ApplicationsAddModal />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          :model-value="(table?.tableApi?.getColumn('companyName')?.getFilterValue() as string)"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Filter companies..."
          @update:model-value="table?.tableApi?.getColumn('companyName')?.setFilterValue($event)"
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <ApplicationsDeleteModal
            ref="deleteModalRef"
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            :selected-ids="getSelectedIds"
          >
            <UButton
              v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
              label="Delete"
              color="error"
              variant="subtle"
              icon="i-lucide-trash"
              @click="deleteModalRef && (deleteModalRef.open = true)"
            >
              <template #trailing>
                <UKbd>
                  {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                </UKbd>
              </template>
            </UButton>
          </ApplicationsDeleteModal>

          <ApplicationsEditModal
            ref="editModalRef"
            :application="selectedApplication"
          />

          <ApplicationsCustomResumeModal
            ref="customResumeModalRef"
            :application="selectedApplication"
          />

          <USelect
            v-model="statusFilter"
            :items="[
              { label: 'All', value: 'all' },
              { label: 'Pending', value: 'pending' },
              { label: 'Applied', value: 'applied' },
              { label: 'Interview', value: 'interview' },
              { label: 'Offer', value: 'offer' },
              { label: 'Rejected', value: 'rejected' }
            ]"
            :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            placeholder="Filter status"
            class="min-w-28"
          />
          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((column: any) => column.getCanHide())
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((column: any) => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                  },
                  onSelect(e?: Event) {
                    e?.preventDefault()
                  }
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              label="Display"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        class="shrink-0"
        :data="data"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-(--ui-bg-elevated)/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-1 first:rounded-l-[calc(var(--ui-radius)*2)] last:rounded-r-[calc(var(--ui-radius)*2)] border-y border-(--ui-border) first:border-l last:border-r',
          td: 'border-b border-(--ui-border)'
        }"
      />

      <div class="flex items-center justify-between gap-3 border-t border-(--ui-border) pt-4 mt-auto">
        <div class="text-sm text-(--ui-text-muted)">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
