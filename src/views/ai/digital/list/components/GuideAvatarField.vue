<template>
  <div
    ><div class="avatar-controls"
      ><ElAvatar :src="modelValue || presets[0]" :size="72" shape="square" /><ElUpload
        accept="image/png,image/jpeg,image/webp"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="selectFile"
        ><ElButton :loading="loading">上传头像</ElButton></ElUpload
      ><ElButton link @click="choose(presets[0])">恢复默认</ElButton></div
    ><div class="avatar-presets"
      ><button
        v-for="(src, index) in presets"
        :key="src"
        type="button"
        :aria-label="'选择预设头像 ' + (index + 1)"
        :aria-pressed="modelValue === src"
        @click="choose(src)"
        ><ElAvatar :src="src" :size="36" shape="square" /></button></div
    ><small
      >支持 PNG、JPG、WebP，最大 512 KB。头像随草稿保存，发布后客户端才使用新头像。</small
    ></div
  >
</template>
<script setup lang="ts">
  import { ref, onBeforeUnmount } from 'vue'
  import { ElMessage, type UploadFile } from 'element-plus'
  import avatar1 from '@/assets/images/avatar/avatar1.webp'
  import avatar2 from '@/assets/images/avatar/avatar2.webp'
  import avatar3 from '@/assets/images/avatar/avatar3.webp'
  defineProps<{ modelValue?: string }>()
  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
  const presets = [avatar1, avatar2, avatar3],
    loading = ref(false)
  let reader: FileReader | undefined
  onBeforeUnmount(() => reader?.abort())
  function choose(src: string) {
    reader?.abort()
    loading.value = false
    emit('update:modelValue', src)
  }
  function selectFile(file: UploadFile) {
    const raw = file.raw
    if (
      !raw ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(raw.type) ||
      raw.size > 512 * 1024
    ) {
      ElMessage.warning('请选择不超过 512 KB 的 PNG、JPG 或 WebP 图片')
      return
    }
    reader?.abort()
    reader = new FileReader()
    loading.value = true
    const activeReader = reader
    reader.onload = () => {
      if (reader !== activeReader) return
      emit('update:modelValue', String(activeReader.result || ''))
      loading.value = false
    }
    reader.onerror = () => {
      loading.value = false
      ElMessage.error('头像读取失败，请重新选择')
    }
    reader.readAsDataURL(raw)
  }
</script>
<style scoped lang="scss">
  .avatar-controls,
  .avatar-presets {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .avatar-presets {
    margin: 12px 0;
  }

  .avatar-presets button {
    padding: 3px;
    cursor: pointer;
    background: transparent;
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
  }

  .avatar-presets button[aria-pressed='true'] {
    border-color: var(--el-color-primary);
  }

  small {
    color: var(--el-text-color-secondary);
  }
</style>
