import * as THREE from 'three'
import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MODEL_BASE } from '../../../domain/models'

export interface PreparedGeometry {
  geometry: THREE.BufferGeometry
  /** post-bake size in mm (x, y, z) */
  size: THREE.Vector3
}

/**
 * Bakes the source part's Z-up (CAD/slicer) axes into the scene's Y-up
 * convention, applies optional extra X/Y/Z rotation for parts whose axes
 * still don't line up after that, then re-centers the pivot to
 * bottom-center (x=0, z=0 at the footprint center, y=0 at the lowest point)
 * so instances can be positioned/stacked with simple offsets.
 */
function prepareGeometry(
  geo: THREE.BufferGeometry,
  extraRotY: number,
  extraRotX = 0,
  extraRotZ = 0,
): PreparedGeometry {
  geo.rotateX(-Math.PI / 2)
  if (extraRotX) geo.rotateX(extraRotX)
  if (extraRotY) geo.rotateY(extraRotY)
  if (extraRotZ) geo.rotateZ(extraRotZ)
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const center = new THREE.Vector3()
  bb.getCenter(center)
  geo.translate(-center.x, -bb.min.y, -center.z)
  geo.computeBoundingBox()
  geo.computeVertexNormals()
  const size = new THREE.Vector3()
  geo.boundingBox!.getSize(size)
  return { geometry: geo, size }
}

/**
 * Flattens every mesh in a loaded model into a single baked geometry. A .3mf
 * can hold more than one object (the ATX PSU bracket ships as two), and
 * keeping only the first would silently drop the rest. Only positions are
 * carried over, so meshes with differing attribute sets still merge —
 * prepareGeometry recomputes normals afterwards regardless.
 */
function mergedMeshGeometry(root: THREE.Object3D): THREE.BufferGeometry {
  root.updateWorldMatrix(true, true)
  const parts: THREE.BufferGeometry[] = []
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const baked = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).toNonIndexed()
    const position = baked.getAttribute('position')
    if (!position) return
    const plain = new THREE.BufferGeometry()
    plain.setAttribute('position', position)
    parts.push(plain)
  })
  if (parts.length === 0) throw new Error(`No mesh found in loaded model`)
  if (parts.length === 1) return parts[0]
  const merged = mergeGeometries(parts)
  if (!merged) throw new Error(`Could not merge ${parts.length} meshes in loaded model`)
  return merged
}

/** Load + prepare a .stl part. `file` is relative to /public/models-3d/. */
export function useStlPart(file: string, extraRotY = 0, extraRotX = 0, extraRotZ = 0): PreparedGeometry {
  const raw = useLoader(STLLoader, MODEL_BASE + file)
  return useMemo(
    () => prepareGeometry(raw.clone(), extraRotY, extraRotX, extraRotZ),
    [raw, extraRotY, extraRotX, extraRotZ],
  )
}

/** Load + prepare a .3mf part. `file` is relative to /public/models-3d/. */
export function use3mfPart(
  file: string,
  extraRotY = 0,
  extraRotX = 0,
  extraRotZ = 0,
): PreparedGeometry {
  const group = useLoader(ThreeMFLoader, MODEL_BASE + file)
  return useMemo(
    () => prepareGeometry(mergedMeshGeometry(group), extraRotY, extraRotX, extraRotZ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group, extraRotY, extraRotX, extraRotZ],
  )
}
