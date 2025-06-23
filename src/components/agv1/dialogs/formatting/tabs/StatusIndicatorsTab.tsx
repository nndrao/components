import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, XCircle, Info, 
  AlertTriangle, Star, Heart, ThumbsUp, Flag,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import type { 
  ColumnFormat, 
  StatusIndicatorConfig, 
  ProgressBar, 
  Rating,
  TrafficLight,
  IconSet
} from '@/types/agv1/common.types';

interface StatusIndicatorsTabProps {
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

const indicatorTypes = [
  { value: 'none', label: 'None', description: 'No status indicator' },
  { value: 'icon', label: 'Icon', description: 'Display icon based on value' },
  { value: 'progressBar', label: 'Progress Bar', description: 'Visual progress indicator' },
  { value: 'rating', label: 'Rating', description: 'Star rating display' },
  { value: 'trafficLight', label: 'Traffic Light', description: 'Color-coded status' },
];

const iconSets: { value: string; label: string; icons: React.ReactNode[] }[] = [
  {
    value: 'status',
    label: 'Status',
    icons: [
      <CheckCircle className="h-4 w-4 text-green-500" />,
      <AlertTriangle className="h-4 w-4 text-yellow-500" />,
      <XCircle className="h-4 w-4 text-red-500" />,
      <Info className="h-4 w-4 text-blue-500" />,
    ],
  },
  {
    value: 'trend',
    label: 'Trend',
    icons: [
      <TrendingUp className="h-4 w-4 text-green-500" />,
      <Minus className="h-4 w-4 text-gray-500" />,
      <TrendingDown className="h-4 w-4 text-red-500" />,
    ],
  },
  {
    value: 'rating',
    label: 'Rating',
    icons: [
      <Star className="h-4 w-4" />,
      <Heart className="h-4 w-4" />,
      <ThumbsUp className="h-4 w-4" />,
      <Flag className="h-4 w-4" />,
    ],
  },
];

const progressBarStyles = [
  { value: 'default', label: 'Default', className: 'bg-blue-500' },
  { value: 'success', label: 'Success', className: 'bg-green-500' },
  { value: 'warning', label: 'Warning', className: 'bg-yellow-500' },
  { value: 'danger', label: 'Danger', className: 'bg-red-500' },
  { value: 'gradient', label: 'Gradient', className: 'bg-gradient-to-r from-blue-500 to-purple-500' },
];

export const StatusIndicatorsTab: React.FC<StatusIndicatorsTabProps> = ({
  format,
  onFormatChange,
}) => {
  const [activeTab, setActiveTab] = useState('type');
  const indicatorType = format.statusIndicator?.type || 'none';

  const updateStatusIndicator = (updates: Partial<StatusIndicatorConfig>) => {
    onFormatChange({
      statusIndicator: { ...format.statusIndicator, ...updates } as StatusIndicatorConfig,
    });
  };

  const updateProgressBar = (updates: Partial<ProgressBar>) => {
    onFormatChange({
      progressBar: { ...format.progressBar, ...updates } as ProgressBar,
    });
  };

  const updateRating = (updates: Partial<Rating>) => {
    onFormatChange({
      rating: { ...format.rating, ...updates } as Rating,
    });
  };

  const updateTrafficLight = (updates: Partial<TrafficLight>) => {
    onFormatChange({
      trafficLight: { ...format.trafficLight, ...updates } as TrafficLight,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Indicator Type</h3>
        <RadioGroup
          value={indicatorType}
          onValueChange={(value) => updateStatusIndicator({ type: value as 'none' | 'icon' | 'progressBar' | 'rating' | 'trafficLight' })}
        >
          <div className="grid gap-3">
            {indicatorTypes.map((type) => (
              <div key={type.value} className="flex items-start space-x-3">
                <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                <Label htmlFor={type.value} className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-muted-foreground">{type.description}</div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      {indicatorType !== 'none' && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="type">Configure</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
          </TabsList>

          <TabsContent value="type" className="mt-6">
            {indicatorType === 'icon' && (
              <div className="space-y-6">
                <div>
                  <Label>Icon Set</Label>
                  <RadioGroup
                    value={format.statusIndicator?.iconSet || 'status'}
                    onValueChange={(value) => updateStatusIndicator({ iconSet: value as IconSet })}
                    className="mt-2"
                  >
                    {iconSets.map((set) => (
                      <div key={set.value} className="flex items-center space-x-3 mb-3">
                        <RadioGroupItem value={set.value} id={`icon-${set.value}`} />
                        <Label 
                          htmlFor={`icon-${set.value}`} 
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <span>{set.label}</span>
                          <div className="flex gap-2">
                            {set.icons}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-text">Show Text with Icon</Label>
                  <Switch
                    id="show-text"
                    checked={format.statusIndicator?.showText ?? false}
                    onCheckedChange={(checked) => updateStatusIndicator({ showText: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="icon-position">Icon Position</Label>
                  <Select
                    value={format.statusIndicator?.position || 'left'}
                    onValueChange={(value) => updateStatusIndicator({ position: value as 'left' | 'right' | 'only' })}
                  >
                    <SelectTrigger id="icon-position" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left of text</SelectItem>
                      <SelectItem value="right">Right of text</SelectItem>
                      <SelectItem value="only">Icon only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {indicatorType === 'progressBar' && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="bar-style">Bar Style</Label>
                  <Select
                    value={format.progressBar?.style || 'default'}
                    onValueChange={(value) => updateProgressBar({ style: value })}
                  >
                    <SelectTrigger id="bar-style" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {progressBarStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-2 rounded overflow-hidden bg-gray-200">
                              <div className={`h-full w-3/4 ${style.className}`} />
                            </div>
                            <span>{style.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bar-height">Bar Height</Label>
                  <div className="flex items-center gap-4 mt-1">
                    <Slider
                      id="bar-height"
                      min={4}
                      max={20}
                      step={2}
                      value={[format.progressBar?.height || 8]}
                      onValueChange={([value]) => updateProgressBar({ height: value })}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-12">
                      {format.progressBar?.height || 8}px
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-percentage">Show Percentage</Label>
                  <Switch
                    id="show-percentage"
                    checked={format.progressBar?.showPercentage ?? true}
                    onCheckedChange={(checked) => updateProgressBar({ showPercentage: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="animated">Animated</Label>
                  <Switch
                    id="animated"
                    checked={format.progressBar?.animated ?? false}
                    onCheckedChange={(checked) => updateProgressBar({ animated: checked })}
                  />
                </div>
              </div>
            )}

            {indicatorType === 'rating' && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="max-rating">Maximum Rating</Label>
                  <Select
                    value={format.rating?.maxRating?.toString() || '5'}
                    onValueChange={(value) => updateRating({ maxRating: parseInt(value) })}
                  >
                    <SelectTrigger id="max-rating" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                      <SelectItem value="10">10 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="rating-icon">Icon Style</Label>
                  <RadioGroup
                    value={format.rating?.icon || 'star'}
                    onValueChange={(value) => updateRating({ icon: value as 'star' | 'heart' })}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="star" id="star-icon" />
                      <Label htmlFor="star-icon" className="flex items-center gap-2 cursor-pointer">
                        <Star className="h-4 w-4" /> Star
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="heart" id="heart-icon" />
                      <Label htmlFor="heart-icon" className="flex items-center gap-2 cursor-pointer">
                        <Heart className="h-4 w-4" /> Heart
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-half">Allow Half Ratings</Label>
                  <Switch
                    id="allow-half"
                    checked={format.rating?.allowHalf ?? false}
                    onCheckedChange={(checked) => updateRating({ allowHalf: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="filled-color">Filled Color</Label>
                  <div className="flex items-center gap-4 mt-1">
                    <Input
                      type="color"
                      value={format.rating?.filledColor || '#FFC107'}
                      onChange={(e) => updateRating({ filledColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      placeholder="#FFC107"
                      value={format.rating?.filledColor || ''}
                      onChange={(e) => updateRating({ filledColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {indicatorType === 'trafficLight' && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="light-shape">Shape</Label>
                  <RadioGroup
                    value={format.trafficLight?.shape || 'circle'}
                    onValueChange={(value) => updateTrafficLight({ shape: value as 'circle' | 'square' })}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="circle" id="circle-shape" />
                      <Label htmlFor="circle-shape" className="cursor-pointer">Circle</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="square" id="square-shape" />
                      <Label htmlFor="square-shape" className="cursor-pointer">Square</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="light-size">Size</Label>
                  <div className="flex items-center gap-4 mt-1">
                    <Slider
                      id="light-size"
                      min={12}
                      max={32}
                      step={2}
                      value={[format.trafficLight?.size || 20]}
                      onValueChange={([value]) => updateTrafficLight({ size: value })}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-12">
                      {format.trafficLight?.size || 20}px
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Color Configuration</h4>
                  {['red', 'yellow', 'green'].map((color) => (
                    <div key={color} className="flex items-center gap-4">
                      <Label className="w-20 capitalize">{color}</Label>
                      <Input
                        type="color"
                        value={
                          format.trafficLight?.colors?.[color as keyof typeof format.trafficLight.colors] ||
                          (color === 'red' ? '#EF4444' : color === 'yellow' ? '#EAB308' : '#10B981')
                        }
                        onChange={(e) => updateTrafficLight({
                          colors: {
                            ...format.trafficLight?.colors,
                            [color]: e.target.value,
                          },
                        })}
                        className="w-20 h-10"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="conditions" className="mt-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define conditions for when to display different indicators based on cell values.
              </p>
              <Button variant="outline" className="w-full">
                Add Condition Rule
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};