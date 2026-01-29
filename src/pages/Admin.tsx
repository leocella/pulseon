import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Upload,
    Image as ImageIcon,
    Video,
    Link as LinkIcon,
    Trash2,
    Eye,
    EyeOff,
    GripVertical,
    Plus,
    Save,
    X,
    Edit,
    Search,
    Download,
    FileUp,
    AlertCircle,
    Play,
    LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { usePanelMedia, useUploadMedia, useDeleteMedia, useUpdateMedia } from '@/hooks/usePanelMedia';
import { UNIDADE } from '@/lib/config';
import { MediaCarousel } from '@/components/MediaCarousel';
import { useAuth } from '@/hooks/useAuth';
import type { MediaItem } from '@/components/MediaCarousel';
import type { PanelMediaItem } from '@/hooks/usePanelMedia';
import { supabase } from '@/integrations/supabase/client';

type MediaType = 'image' | 'video' | 'external';

// Max file sizes - Aumentados para suportar arquivos maiores
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB (antes 5MB)
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB (antes 50MB)

function AdminContent() {
    const navigate = useNavigate();
    const { signOut, user } = useAuth();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PanelMediaItem | null>(null);
    const [mediaType, setMediaType] = useState<MediaType>('image');
    const [externalUrl, setExternalUrl] = useState('');
    const [altText, setAltText] = useState('');
    const [duration, setDuration] = useState(8);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [bulkUploadProgress, setBulkUploadProgress] = useState<{ current: number, total: number } | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bulkFileInputRef = useRef<HTMLInputElement>(null);

    const { data: mediaItems = [], isLoading } = usePanelMedia();
    const uploadMedia = useUploadMedia();
    const deleteMedia = useDeleteMedia();
    const updateMedia = useUpdateMedia();


    // Validate file size
    const validateFileSize = (file: File): boolean => {
        const maxSize = file.type.startsWith('image/') ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / 1024 / 1024;
            toast.error(`Arquivo muito grande! Tamanho máximo: ${maxSizeMB}MB`);
            return false;
        }
        return true;
    };

    // Compress image and rotate portrait to landscape
    const compressImage = async (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Detectar se é retrato (mais alto que largo)
                    const isPortrait = height > width;

                    // Max dimensions para paisagem
                    const MAX_WIDTH = 1920;
                    const MAX_HEIGHT = 1080;

                    if (isPortrait) {
                        // Rotacionar para paisagem: trocar largura/altura
                        // Após rotação: nova largura = altura antiga, nova altura = largura antiga
                        const rotatedWidth = height;
                        const rotatedHeight = width;

                        // Aplicar limites na imagem rotacionada
                        let finalWidth = rotatedWidth;
                        let finalHeight = rotatedHeight;

                        if (finalWidth > MAX_WIDTH) {
                            finalHeight *= MAX_WIDTH / finalWidth;
                            finalWidth = MAX_WIDTH;
                        }
                        if (finalHeight > MAX_HEIGHT) {
                            finalWidth *= MAX_HEIGHT / finalHeight;
                            finalHeight = MAX_HEIGHT;
                        }

                        canvas.width = finalWidth;
                        canvas.height = finalHeight;

                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            // Rotacionar 90 graus no sentido horário
                            ctx.translate(finalWidth / 2, finalHeight / 2);
                            ctx.rotate(Math.PI / 2);
                            // Desenhar a imagem centralizada (considerando a rotação)
                            ctx.drawImage(img, -finalHeight / 2, -finalWidth / 2, finalHeight, finalWidth);
                        }
                    } else {
                        // Já é paisagem, apenas redimensionar se necessário
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }

                        canvas.width = width;
                        canvas.height = height;

                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);
                    }

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                resolve(file);
                            }
                        },
                        'image/jpeg',
                        0.85
                    );
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!validateFileSize(file)) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Compress image if it's an image
        if (file.type.startsWith('image/')) {
            toast.info('Processando imagem...');

            // Detectar se é retrato antes de comprimir
            const isPortrait = await new Promise<boolean>((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img.height > img.width);
                img.src = URL.createObjectURL(file);
            });

            const compressed = await compressImage(file);
            setSelectedFile(compressed);

            if (isPortrait) {
                toast.success('Imagem rotacionada para paisagem e comprimida!');
            } else {
                toast.success('Imagem comprimida!');
            }
        } else if (file.type.startsWith('video/')) {
            // Create video preview
            const url = URL.createObjectURL(file);
            setVideoPreview(url);
            setSelectedFile(file);
        } else {
            setSelectedFile(file);
        }
    };

    const handleAddMedia = async () => {
        try {
            if (mediaType === 'external') {
                if (!externalUrl.trim()) {
                    toast.error('Digite uma URL válida');
                    return;
                }

                await uploadMedia.mutateAsync({
                    type: 'external',
                    url: externalUrl,
                    alt: altText || 'Link externo',
                    duration,
                });
            } else {
                if (!selectedFile) {
                    toast.error('Selecione um arquivo');
                    return;
                }

                await uploadMedia.mutateAsync({
                    type: mediaType,
                    file: selectedFile,
                    alt: altText || selectedFile.name,
                    duration: mediaType === 'image' ? duration : undefined,
                });
            }

            toast.success('Mídia adicionada com sucesso!');
            setIsAddDialogOpen(false);
            resetForm();
        } catch (error: any) {
            console.error('Error adding media:', error);
            const errorMessage = error?.message || 'Erro desconhecido';
            toast.error(`Erro ao adicionar mídia: ${errorMessage}`);
        }
    };

    const handleEditMedia = async () => {
        if (!editingItem) return;

        try {
            await updateMedia.mutateAsync({
                id: editingItem.id,
                duration: duration,
            });

            toast.success('Mídia atualizada!');
            setIsEditDialogOpen(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Error updating media:', error);
            toast.error('Erro ao atualizar mídia');
        }
    };

    const openEditDialog = (item: PanelMediaItem) => {
        setEditingItem(item);
        setDuration(item.duration);
        setIsEditDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja deletar esta mídia?')) return;

        try {
            await deleteMedia.mutateAsync(id);
            toast.success('Mídia deletada');
        } catch (error) {
            console.error('Error deleting media:', error);
            toast.error('Erro ao deletar mídia');
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        try {
            await updateMedia.mutateAsync({ id, active: !currentActive });
            toast.success(currentActive ? 'Mídia desativada' : 'Mídia ativada');
        } catch (error) {
            console.error('Error toggling media:', error);
            toast.error('Erro ao atualizar mídia');
        }
    };

    const resetForm = () => {
        setMediaType('image');
        setExternalUrl('');
        setAltText('');
        setDuration(8);
        setSelectedFile(null);
        setSelectedFiles([]);
        setVideoPreview(null);
        setBulkUploadProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
    };

    // Handle multiple file selection
    const handleBulkFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const validFiles: File[] = [];

        for (const file of files) {
            if (!validateFileSize(file)) continue;
            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            toast.error('Nenhum arquivo válido selecionado');
            return;
        }

        setSelectedFiles(validFiles);
        toast.success(`${validFiles.length} arquivo(s) selecionado(s)`);
    };

    // Upload multiple files
    const handleBulkUpload = async () => {
        if (selectedFiles.length === 0) {
            toast.error('Selecione pelo menos um arquivo');
            return;
        }

        setBulkUploadProgress({ current: 0, total: selectedFiles.length });

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            setBulkUploadProgress({ current: i + 1, total: selectedFiles.length });

            try {
                let fileToUpload = file;
                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');
                const type: MediaType = isImage ? 'image' : isVideo ? 'video' : 'image';

                // Compress images
                if (isImage) {
                    fileToUpload = await compressImage(file);
                }

                await uploadMedia.mutateAsync({
                    type,
                    file: fileToUpload,
                    alt: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for alt text
                    duration: isImage ? duration : undefined,
                });

                successCount++;
            } catch (error: any) {
                console.error(`Error uploading ${file.name}:`, error);
                toast.error(`Erro em ${file.name}: ${error?.message || 'Erro desconhecido'}`);
                errorCount++;
            }
        }

        setBulkUploadProgress(null);

        if (successCount > 0) {
            toast.success(`${successCount} arquivo(s) enviado(s) com sucesso!`);
        }
        if (errorCount > 0) {
            toast.error(`${errorCount} arquivo(s) falharam no upload`);
        }

        setIsBulkUploadOpen(false);
        resetForm();
    };


    // Export configuration
    const handleExportConfig = () => {
        const config = {
            unidade: UNIDADE,
            exportDate: new Date().toISOString(),
            media: mediaItems.map(item => ({
                type: item.type,
                alt: item.alt,
                duration: item.duration,
                active: item.active,
                // Don't export src for uploaded files, only external links
                ...(item.type === 'external' && { src: item.src })
            }))
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `panel-media-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Configuração exportada!');
    };

    // Filter media items
    const filteredMediaItems = mediaItems.filter(item =>
        item.alt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.src.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeMediaItems: MediaItem[] = mediaItems
        .filter(item => item.active)
        .map(item => ({
            type: item.type as 'image' | 'video' | 'external',
            src: item.src,
            alt: item.alt || '',
            duration: item.duration,
        }));

    return (
        <div className="min-h-screen bg-background p-6 pb-20">
            {/* Header */}
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Painel Administrativo</h1>
                    <p className="text-muted-foreground">Gerenciar mídias exibidas no Painel TV</p>
                    <p className="text-sm text-muted-foreground mt-1">Unidade: {UNIDADE}</p>
                    {user?.email && (
                        <p className="text-xs text-muted-foreground mt-1">Logado como: {user.email}</p>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                        await signOut();
                        navigate('/login');
                    }}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                </Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Preview */}
                <div className="lg:col-span-2">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Eye className="w-5 h-5 text-primary" />
                            Preview do Painel (como aparece na TV)
                        </h2>
                        <div className="bg-black rounded-xl overflow-hidden" style={{ height: '60vh', minHeight: '400px' }}>
                            {activeMediaItems.length > 0 ? (
                                <MediaCarousel items={activeMediaItems} autoPlay showControls className="h-full" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white">
                                    <div className="text-center">
                                        <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p>Nenhuma mídia ativa</p>
                                        <p className="text-sm opacity-75 mt-2">Adicione mídias para visualizar</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            As imagens aparecem inteiras (sem corte) com fundo preto nas bordas
                        </p>
                    </Card>

                </div>

                {/* Add Media */}
                <div className="lg:col-span-1">
                    <Card className="p-6">
                        {/* Single file upload */}
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full h-14 text-lg" onClick={() => setIsAddDialogOpen(true)}>
                                    <Plus className="w-5 h-5 mr-2" />
                                    Adicionar Mídia
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Adicionar Nova Mídia</DialogTitle>
                                    <DialogDescription>
                                        Escolha o tipo de mídia e faça o upload ou adicione um link externo
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 mt-4">
                                    {/* Media Type */}
                                    <div>
                                        <Label>Tipo de Mídia</Label>
                                        <Select value={mediaType} onValueChange={(v) => setMediaType(v as MediaType)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="image">
                                                    <div className="flex items-center gap-2">
                                                        <ImageIcon className="w-4 h-4" />
                                                        Imagem
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="video">
                                                    <div className="flex items-center gap-2">
                                                        <Video className="w-4 h-4" />
                                                        Vídeo
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="external">
                                                    <div className="flex items-center gap-2">
                                                        <LinkIcon className="w-4 h-4" />
                                                        Link Externo
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* File Upload or External URL */}
                                    {mediaType === 'external' ? (
                                        <div>
                                            <Label>URL Externa</Label>
                                            <Input
                                                type="url"
                                                placeholder="https://exemplo.com/imagem.jpg"
                                                value={externalUrl}
                                                onChange={(e) => setExternalUrl(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <Label>Arquivo</Label>
                                            <Input
                                                ref={fileInputRef}
                                                type="file"
                                                accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                                                onChange={handleFileSelect}
                                            />
                                            {selectedFile && (
                                                <div className="mt-2">
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                                    </p>
                                                    {videoPreview && (
                                                        <div className="mt-2 aspect-video bg-black rounded overflow-hidden">
                                                            <video src={videoPreview} controls className="w-full h-full object-contain" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Máximo: {mediaType === 'image' ? '50MB' : '500MB'}
                                                {mediaType === 'image' && ' (será comprimida automaticamente)'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Alt Text */}
                                    <div>
                                        <Label>Descrição (opcional)</Label>
                                        <Input
                                            placeholder="Descrição da mídia"
                                            value={altText}
                                            onChange={(e) => setAltText(e.target.value)}
                                        />
                                    </div>

                                    {/* Duration (for images only) */}
                                    {(mediaType === 'image' || mediaType === 'external') && (
                                        <div>
                                            <Label>Duração (segundos)</Label>
                                            <Input
                                                type="number"
                                                min="3"
                                                max="60"
                                                value={duration}
                                                onChange={(e) => setDuration(parseInt(e.target.value) || 8)}
                                            />
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            onClick={handleAddMedia}
                                            disabled={uploadMedia.isPending}
                                            className="flex-1"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {uploadMedia.isPending ? 'Salvando...' : 'Salvar'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsAddDialogOpen(false);
                                                resetForm();
                                            }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Bulk upload dialog */}
                        <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full h-12 mt-3" variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
                                    <FileUp className="w-5 h-5 mr-2" />
                                    Upload Múltiplo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Upload de Múltiplos Arquivos</DialogTitle>
                                    <DialogDescription>
                                        Selecione várias imagens e vídeos de uma vez
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 mt-4">
                                    {/* File Input */}
                                    <div>
                                        <Label>Selecionar Arquivos</Label>
                                        <Input
                                            ref={bulkFileInputRef}
                                            type="file"
                                            accept="image/*,video/*"
                                            multiple
                                            onChange={handleBulkFileSelect}
                                            className="cursor-pointer"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Imagens e vídeos. Imagens serão comprimidas automaticamente.
                                        </p>
                                    </div>

                                    {/* Selected Files List */}
                                    {selectedFiles.length > 0 && (
                                        <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                                            <p className="text-sm font-medium mb-2">
                                                {selectedFiles.length} arquivo(s) selecionado(s):
                                            </p>
                                            <ul className="space-y-1">
                                                {selectedFiles.map((file, index) => (
                                                    <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                                                        {file.type.startsWith('image/') ? (
                                                            <ImageIcon className="w-3 h-3" />
                                                        ) : (
                                                            <Video className="w-3 h-3" />
                                                        )}
                                                        <span className="truncate flex-1">{file.name}</span>
                                                        <span>({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Duration for images */}
                                    <div>
                                        <Label>Duração das imagens (segundos)</Label>
                                        <Input
                                            type="number"
                                            min="3"
                                            max="60"
                                            value={duration}
                                            onChange={(e) => setDuration(parseInt(e.target.value) || 8)}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Vídeos usam sua própria duração
                                        </p>
                                    </div>

                                    {/* Progress */}
                                    {bulkUploadProgress && (
                                        <div className="bg-primary/10 p-3 rounded-lg">
                                            <p className="text-sm font-medium text-center">
                                                Enviando {bulkUploadProgress.current} de {bulkUploadProgress.total}...
                                            </p>
                                            <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                                                <div
                                                    className="bg-primary h-full transition-all duration-300"
                                                    style={{ width: `${(bulkUploadProgress.current / bulkUploadProgress.total) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            onClick={handleBulkUpload}
                                            disabled={selectedFiles.length === 0 || bulkUploadProgress !== null}
                                            className="flex-1"
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            {bulkUploadProgress ? 'Enviando...' : `Enviar ${selectedFiles.length} arquivo(s)`}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsBulkUploadOpen(false);
                                                resetForm();
                                            }}
                                            disabled={bulkUploadProgress !== null}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <div className="mt-6">
                            <p className="text-sm text-muted-foreground mb-2">Formatos suportados:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Imagens: JPG, PNG, WEBP (max 50MB)</li>
                                <li>• Vídeos: MP4, WEBM (max 500MB)</li>
                                <li>• Links: URLs de imagens/vídeos</li>
                            </ul>
                        </div>

                        <div className="mt-6 pt-6 border-t">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleExportConfig}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar Configuração
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Media List */}
            <Card className="p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Mídias Cadastradas ({mediaItems.length})</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar mídias..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse h-20 bg-muted rounded-lg" />
                        ))}
                    </div>
                ) : filteredMediaItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {searchQuery ? (
                            <>
                                <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>Nenhuma mídia encontrada</p>
                                <p className="text-sm mt-2">Tente outro termo de busca</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>Nenhuma mídia cadastrada</p>
                                <p className="text-sm mt-2">Clique em "Adicionar Mídia" para começar</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMediaItems.map((item, index) => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${item.active ? 'bg-card border-border' : 'bg-muted/50 border-muted opacity-60'
                                    }`}
                            >
                                <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />

                                <div className="flex-shrink-0">
                                    {item.type === 'image' || item.type === 'external' ? (
                                        <ImageIcon className="w-8 h-8 text-primary" />
                                    ) : (
                                        <Video className="w-8 h-8 text-primary" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{item.alt || 'Sem descrição'}</p>
                                    <p className="text-sm text-muted-foreground truncate">{item.src}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-muted-foreground">
                                            #{index + 1}
                                        </span>
                                        {item.type !== 'video' && (
                                            <span className="text-xs text-muted-foreground">
                                                {item.duration}s
                                            </span>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded ${item.active ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'
                                            }`}>
                                            {item.active ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditDialog(item)}
                                        title="Editar"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleActive(item.id, item.active)}
                                        title={item.active ? 'Desativar' : 'Ativar'}
                                    >
                                        {item.active ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(item.id)}
                                        title="Deletar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Mídia</DialogTitle>
                        <DialogDescription>
                            Ajuste as configurações da mídia
                        </DialogDescription>
                    </DialogHeader>

                    {editingItem && (
                        <div className="space-y-4 mt-4">
                            <div>
                                <Label>Descrição</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {editingItem.alt || 'Sem descrição'}
                                </p>
                            </div>

                            {editingItem.type !== 'video' && (
                                <div>
                                    <Label>Duração (segundos)</Label>
                                    <Input
                                        type="number"
                                        min="3"
                                        max="60"
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value) || 8)}
                                    />
                                </div>
                            )}

                            <div className="flex gap-2 pt-4">
                                <Button
                                    onClick={handleEditMedia}
                                    disabled={updateMedia.isPending}
                                    className="flex-1"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false);
                                        setEditingItem(null);
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function Admin() {
    return <AdminContent />;
}
