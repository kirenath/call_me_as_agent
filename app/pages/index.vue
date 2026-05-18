<script setup lang="ts">
const { data: requests } = useFetch<any[]>('/api/internal/requests')
const { data: settings } = useFetch<any>('/api/settings')
const { data: authStatus } = useFetch<any>('/api/auth/check')
const { t } = useI18n()

const pendingCount = computed(() => requests.value?.length || 0)

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  useToast().add({ title: t('copied'), color: 'success' })
}

const statusItems = computed(() => {
  const items = []
  if (settings.value?.showPendingCountPublic) {
    items.push({
      label: settings.value?.pendingRequestsLabel || t('pending_requests'),
      value: pendingCount.value,
      icon: 'i-lucide-message-square',
      color: 'primary'
    })
  }
  items.push({
    label: t('api_key_auth'),
    value: settings.value?.enableApiKeyAuth ? t('enabled') : t('disabled'),
    icon: 'i-lucide-shield',
    color: settings.value?.enableApiKeyAuth ? 'success' : 'neutral'
  })
  if (settings.value?.showTokensPublic) {
    items.push({
      label: `${settings.value?.tokensLabel || 'Tokens'} (In)`,
      value: (settings.value?.tokensInputToday || 0).toLocaleString(),
      icon: 'i-lucide-arrow-right-to-line',
      color: 'indigo'
    })
    items.push({
      label: `${settings.value?.tokensLabel || 'Tokens'} (Out)`,
      value: (settings.value?.tokensOutputToday || 0).toLocaleString(),
      icon: 'i-lucide-arrow-up-circle',
      color: 'violet'
    })
  }
  return items
})

const baseUrl = computed(() => settings.value?.publicBaseUrl || 'http://localhost:3000')
const siteTitle = computed(() => settings.value?.siteTitle || 'Call Me As Agent')
const siteSubtitle = computed(() => settings.value?.siteSubtitle || 'A Human-in-the-loop LLM Proxy Service')
</script>

<template>
  <div class="min-h-screen transition-colors bg-[var(--color-brand-light)] font-sans-ui text-[#111111]">
    <!-- Top Edition Header -->
    <div class="border-b-2 border-[#111111] py-2 px-4 flex justify-between items-center text-xs font-mono-data uppercase tracking-widest bg-white">
      <div>Vol. 1 | {{ new Date().toLocaleDateString() }}</div>
      <div>The Developer Edition</div>
    </div>

    <UContainer class="max-w-screen-xl mx-auto px-4 py-8">
      <!-- Hero / Logo -->
      <header class="mb-12 text-center border-b-4 border-[#111111] pb-8 animate-in fade-in duration-500">
        <h1 class="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-[#111111] mb-6 font-serif-display uppercase leading-[0.9]">
          {{ siteTitle }}
        </h1>
        <p class="text-xl md:text-2xl text-neutral-600 max-w-3xl mx-auto font-body italic border-y border-[#111111] py-4">
          {{ siteSubtitle }}
        </p>
      </header>

      <!-- Main Newspaper Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-0 border-l border-t border-[#111111] bg-white newsprint-texture">
        
        <!-- Left Column: Status/Stats (4 cols) -->
        <div class="lg:col-span-4 border-r border-b border-[#111111] p-6 lg:p-8 bg-[#F9F9F7]">
          <h2 class="text-3xl font-serif-display font-bold uppercase mb-6 border-b-2 border-[#111111] pb-2">
            系统状态
          </h2>
          <div class="space-y-6">
            <div
              v-for="item in statusItems"
              :key="item.label"
              class="border border-[#111111] p-4 bg-white hard-shadow-hover flex items-center gap-4"
            >
              <div class="border border-[#111111] h-12 w-12 flex items-center justify-center bg-[#F9F9F7]">
                <UIcon
                  :name="item.icon"
                  class="w-6 h-6 text-[#111111]"
                />
              </div>
              <div>
                <div class="text-[10px] text-neutral-500 font-bold uppercase tracking-widest font-mono-data">
                  {{ item.label }}
                </div>
                <div class="text-2xl font-black text-[#111111] font-serif-display">
                  {{ item.value }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Endpoints (8 cols) -->
        <div class="lg:col-span-8 border-r border-b border-[#111111] p-6 lg:p-8 bg-white">
          <h2 class="text-4xl font-serif-display font-black uppercase mb-8 flex items-center gap-4">
            <span class="bg-[#111111] text-white p-2">
              <UIcon name="i-lucide-network" class="w-6 h-6" />
            </span>
            可用端点
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              type="button"
              @click="copyToClipboard(`${baseUrl}/api/openai/v1`)"
              class="border border-[#111111] p-6 hard-shadow-hover bg-[#F9F9F7] text-left cursor-pointer w-full transition-all"
            >
              <div class="flex justify-between items-start mb-4 border-b border-[#111111] pb-4 gap-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-simple-icons-openai" class="text-[#111111] w-6 h-6" />
                  <span class="font-bold font-serif-display text-2xl">OpenAI V1</span>
                </div>
                <span class="text-[#111111] underline-offset-4 decoration-2 decoration-[#CC0000] hover:underline text-xs font-mono-data uppercase tracking-widest font-bold">
                  [复制]
                </span>
              </div>
              <code class="text-xs break-all block font-mono-data text-[#111111] mb-4">{{ baseUrl }}/api/openai/v1</code>
              <div v-if="settings?.showApiKeyPublic && settings?.enableApiKeyAuth" class="text-[10px] text-[#CC0000] uppercase font-bold tracking-widest flex items-center gap-1 font-mono-data">
                <UIcon name="i-lucide-key" /> {{ t('auth_hint') }}
              </div>
            </button>

            <button
              type="button"
              @click="copyToClipboard(`${baseUrl}/api/claude`)"
              class="border border-[#111111] p-6 hard-shadow-hover bg-[#F9F9F7] text-left cursor-pointer w-full transition-all"
            >
              <div class="flex justify-between items-start mb-4 border-b border-[#111111] pb-4 gap-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-simple-icons-anthropic" class="text-[#111111] w-6 h-6" />
                  <span class="font-bold font-serif-display text-2xl">Claude V1</span>
                </div>
                <span class="text-[#111111] underline-offset-4 decoration-2 decoration-[#CC0000] hover:underline text-xs font-mono-data uppercase tracking-widest font-bold">
                  [复制]
                </span>
              </div>
              <code class="text-xs break-all block font-mono-data text-[#111111] mb-4">{{ baseUrl }}/api/claude</code>
              <div v-if="settings?.showApiKeyPublic && settings?.enableApiKeyAuth" class="text-[10px] text-[#CC0000] uppercase font-bold tracking-widest flex items-center gap-1 font-mono-data">
                <UIcon name="i-lucide-key" /> {{ t('auth_hint') }}
              </div>
            </button>
          </div>
        </div>

      </div>

      <div class="py-8 text-center font-serif-display text-2xl text-neutral-400 tracking-[1em]">
        ✧ ✧ ✧
      </div>

      <footer class="border-t-4 border-[#111111] pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-xs text-[#111111] font-mono-data uppercase">
        <div class="flex flex-col gap-2">
          <div class="font-bold text-sm bg-[#111111] text-white px-2 py-1 inline-block text-center md:text-left">{{ siteTitle }}</div>
          <div class="font-noto-sc normal-case tracking-normal">基于 MIT 协议发布</div>
          <div class="mt-2 text-[10px] max-w-xl normal-case tracking-normal leading-relaxed text-neutral-600 font-noto-sc">
            <strong>Disclaimer:</strong> 本系统仅为 API 模拟与代理工具。通过此系统产生的所有内容均由后台人员手动输入，或经由人工转接至其他 AI 模型生成。使用此系统时，使用者应确保符合当地法律法规及对应的使用条款。
          </div>
        </div>
        
        <div class="flex gap-4 self-center md:self-auto">
          <a
            href="https://github.com/kirenath/call_me_as_agent"
            target="_blank"
            class="border border-[#111111] p-3 hover:bg-[#111111] hover:text-white transition-colors flex items-center gap-2"
          >
            <UIcon name="i-simple-icons-github" class="w-5 h-5" />
            <span class="font-bold">GITHUB</span>
          </a>
        </div>
      </footer>
    </UContainer>
  </div>
</template>