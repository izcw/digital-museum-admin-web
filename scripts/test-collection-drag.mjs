import { createServer } from 'vite'

// 仅隔离测试服务替换藏品 API；页面、VueDraggable 和样式均加载真实源码。
const server = await createServer({
  server: { host: '127.0.0.1', port: 3016, strictPort: true, open: false },
  plugins: [
    {
      name: 'isolated-collection-api',
      enforce: 'pre',
      transform(_code, id) {
        if (!id.replaceAll('\\', '/').endsWith('/src/api/collections.ts')) return
        return `
        const items = Array.from({length:6}, (_, i) => ({
          id:'fixture-'+i, title:'测试藏品'+(i+1), category:'金属', period:'商',
          material:'铜', museum:'测试博物馆', description:'仅用于拖拽验证的隔离数据',
          dimensions:'', level:'一级', cover:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160"><rect width="300" height="160" fill="hsl('+i*50+' 35% 80%)"/></svg>'),
          gallery:[], hasModel:false, modelName:'', published:true, treasured:false
        }));
        export async function fetchCollections(){return [...items]}
        export async function reorderCollections(ids){
          document.body.dataset.savedOrder=ids.join(',');
          await new Promise(resolve=>setTimeout(resolve,450));
          if(document.body.dataset.failOrder==='true') throw new Error('隔离测试：保存失败');
          return ids.map(id=>items.find(item=>item.id===id));
        }
        export async function deleteCollectionRequest(){throw new Error('隔离测试禁止删除')}
        export async function importCollectionPackage(){throw new Error('隔离测试禁止导入')}
        export async function updateCollection(){throw new Error('隔离测试禁止修改')}
      `
      }
    }
  ]
})
await server.listen()
console.log('隔离拖拽测试：http://127.0.0.1:3016/tests/collection-drag.html（不会访问藏品 API）')
