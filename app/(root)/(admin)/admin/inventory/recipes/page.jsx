"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import { showToast } from "@/lib/showToast";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "#", label: "Recipes" },
];

const UNITS = ["kg", "g", "l", "ml", "pcs"];

const formSchema = z.object({
  product: z.string().trim().min(1, "Select a product"),
  name: z.string().trim().optional().default(""),
  active: z.boolean().default(true),
  items: z
    .array(
      z.object({
        ingredient: z.string().trim().min(1, "Select an ingredient"),
        quantity: z.coerce.number().positive(),
        unit: z.enum(UNITS),
        wastagePercentage: z.coerce.number().min(0).max(100).optional().default(0),
        optional: z.boolean().optional().default(false),
      }),
    )
    .min(1, "Add at least one ingredient"),
});

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: "",
      name: "",
      active: true,
      items: [{ ingredient: "", quantity: 1, unit: "g", wastagePercentage: 0, optional: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const load = async () => {
    setLoading(true);
    try {
      const [recipesRes, productsRes, ingredientsRes] = await Promise.all([
        axios.get("/api/admin/inventory/recipes"),
        axios.get("/api/product", { params: { deleteType: "SD", size: 1000 } }),
        axios.get("/api/admin/inventory/ingredients", { params: { active: "true", limit: 500 } }),
      ]);

      if (recipesRes.data.success) setRecipes(recipesRes.data.data);
      if (productsRes.data.success) setProducts(productsRes.data.data || []);
      if (ingredientsRes.data.success) setIngredients(ingredientsRes.data.data.ingredients || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    form.reset({
      product: "",
      name: "",
      active: true,
      items: [{ ingredient: "", quantity: 1, unit: "g", wastagePercentage: 0, optional: false }],
    });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const { data } = await axios.post("/api/admin/inventory/recipes", values);
      if (!data.success) throw new Error(data.message);
      showToast("success", "Recipe created.");
      setOpen(false);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (recipe) => {
    try {
      const { data } = await axios.patch(`/api/admin/inventory/recipes/${recipe._id}`, {
        active: !recipe.active,
      });
      if (!data.success) throw new Error(data.message);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    }
  };

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recipes / BOM</h1>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add Recipe
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Only the recipe marked <b>Active</b> for a product is used to consume ingredient stock
        when it&apos;s sold. Creating a new recipe for a product automatically deactivates its
        previous version.
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Ingredients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && recipes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No recipes yet.
                  </TableCell>
                </TableRow>
              )}
              {recipes.map((recipe) => (
                <TableRow key={recipe._id}>
                  <TableCell className="font-medium">{recipe.product?.name || "Unknown product"}</TableCell>
                  <TableCell>v{recipe.version}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {recipe.items
                      .map((it) => `${it.ingredient?.name || "?"} (${it.quantity}${it.unit})`)
                      .join(", ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={recipe.active ? "default" : "outline"}>
                      {recipe.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(recipe)}>
                      {recipe.active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Recipe</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <FormField
                control={form.control}
                name="product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <FormControl>
                      <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                        <option value="">Select a product...</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe Name (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Chicken Biryani" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Ingredients</FormLabel>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      append({ ingredient: "", quantity: 1, unit: "g", wastagePercentage: 0, optional: false })
                    }
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Line
                  </Button>
                </div>

                {fields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-start border rounded-md p-3">
                    <div className="col-span-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.ingredient`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                                <option value="">Ingredient...</option>
                                {ingredients.map((ing) => (
                                  <option key={ing._id} value={ing._id}>{ing.name}</option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" step="any" placeholder="Qty" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                                {UNITS.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.wastagePercentage`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" step="any" placeholder="Waste %" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1 flex items-center h-9">
                      <FormField
                        control={form.control}
                        name={`items.${index}.optional`}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-1">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <span className="text-[10px] text-muted-foreground">Opt.</span>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1 flex items-center h-9">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <ButtonLoading type="submit" loading={saving} text="Save Recipe" />
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
