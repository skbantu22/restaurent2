// "use client";

// import { Dialog, DialogContent } from "@/components/ui/dialog";
// import Image from "next/image";
// import { X, Plus } from "lucide-react";

// export default function CategoryProductsModal({
//   category,
//   open,
//   onClose,
//   products = [],
// }) {
//   return (
//     <Dialog open={open} onOpenChange={onClose}>
//       <DialogContent className="w-[95vw] max-w-5xl h-[80vh] max-h-[80vh] rounded-2xl border border-zinc-800 bg-[#183310] p-0 overflow-hidden">
//         {/* Header */}
//         <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
//           <h2 className="text-2xl font-bold text-white">{category?.title}</h2>

//           <button
//             onClick={onClose}
//             className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-zinc-800"
//           >
//             <X className="h-6 w-6 text-white" />
//           </button>
//         </div>

//         {/* Body */}
//         <div className="h-[calc(80vh-64px)] overflow-y-auto p-6">
//           {products.length === 0 ? (
//             <div className="flex h-full items-center justify-center">
//               <p className="text-zinc-400">No products found.</p>
//             </div>
//           ) : (
//             <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
//               {products.map((product) => (
//                 <div
//                   key={product._id}
//                   className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
//                 >
//                   <div className="relative h-48">
//                     <Image
//                       src={product.thumbnail}
//                       alt={product.title}
//                       fill
//                       className="object-cover"
//                     />
//                   </div>

//                   <div className="p-4">
//                     <h3 className="font-bold text-white">{product.title}</h3>

//                     <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
//                       {product.description}
//                     </p>

//                     <div className="mt-4 flex items-center justify-between">
//                       <span className="text-xl font-bold text-orange-500">
//                         £{product.price}
//                       </span>

//                       <button className="rounded-lg bg-orange-500 px-3 py-2 text-white hover:bg-orange-600">
//                         <Plus className="inline mr-1 h-4 w-4" />
//                         ADD
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
